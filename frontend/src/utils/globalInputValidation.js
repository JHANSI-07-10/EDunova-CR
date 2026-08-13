export function setupGlobalInputValidation() {
  document.addEventListener('input', (e) => {
    const target = e.target;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      // Email fields must never be filtered — they legitimately contain @, .,
      // digits, hyphens and underscores. The placeholder "name@example.com"
      // previously triggered the text-only rule below, silently stripping
      // those characters and making valid addresses impossible to type.
      if (target.type === 'email') return;

      const name = (target.name || target.placeholder || target.id || '').toLowerCase();
      
      // Attempt to get label text if available. Only trust the parent
      // element's text when this is the ONLY editable field inside it —
      // otherwise a sibling field's placeholder/label (e.g. "Phone (*)"
      // elsewhere in the same form) leaks into the identification and the
      // wrong filter applies, e.g. the applicant-name field becoming a
      // digits-only phone field so letters can never be typed.
      let labelText = '';
      if (target.labels && target.labels.length > 0) {
        labelText = target.labels[0].innerText.toLowerCase();
      } else if (target.previousElementSibling) {
        // Only trust the previous sibling when it is a genuine label: a
        // <label> element, or a short text element that contains no form
        // controls. A sibling <select> or other control leaks its option
        // text (e.g. a "Phone" source-of-enquiry option) into the
        // identification, which misclassifies the field (a "Preferred
        // branch" text field becoming a digits-only phone field).
        const sib = target.previousElementSibling;
        const sibText = (sib.innerText || '').trim();
        // Count the sibling itself too — a <select> contains <option>s, not
        // form controls, so querySelectorAll alone would miss it and its
        // option text (e.g. a "Phone" source-of-enquiry option) would leak
        // into the identification.
        const sibIsControl = sib.matches('input, textarea, select');
        const sibHasControls = sibIsControl || sib.querySelectorAll('input, textarea, select').length > 0;
        if (sib.tagName === 'LABEL' || (!sibHasControls && sibText.length > 0 && sibText.length <= 60)) {
          labelText = sibText.toLowerCase();
        }
      } else if (target.parentElement) {
        // Only trust the parent element's text when this is the ONLY editable
        // field inside it — otherwise a sibling field's placeholder/label
        // (e.g. "Phone (*)" elsewhere in the same form) leaks into the
        // identification and the wrong filter applies, e.g. the
        // applicant-name field becoming a digits-only phone field so letters
        // can never be typed.
        const editable = target.parentElement.querySelectorAll('input, textarea, select');
        if (editable.length === 1) {
          labelText = target.parentElement.innerText.toLowerCase();
        }
      }
      
      const ident = (name + ' ' + labelText);
      let newValue = target.value;
      let modified = false;

      // 1. Text Only (Names, Religions, Nationalities, etc.)
      // Guarded against 'email' so a label like "Email Address" or a
      // placeholder containing "name" (e.g. name@example.com) never turns a
      // real text/email field into a letters-only filter.
      if (
        (ident.includes('name') || ident.includes('religion') || ident.includes('nationality') || ident.includes('city') || ident.includes('state') || ident.includes('relation') || ident.includes('occupation')) &&
        !ident.includes('email') &&
        !ident.includes('school') && !ident.includes('company') && !ident.includes('username')
      ) {
        const filtered = newValue.replace(/[^A-Za-z\s]/g, '');
        if (filtered !== newValue) {
          newValue = filtered;
          modified = true;
        }
      }
      
      // 2. Exact 10 Digits (Phones)
      else if (ident.includes('phone') || ident.includes('mobile') || ident.includes('contact')) {
        const filtered = newValue.replace(/[^0-9]/g, '').slice(0, 10);
        if (filtered !== newValue) {
          newValue = filtered;
          modified = true;
        }
      }
      
      // 3. Exact 6 Digits (Pincodes / OTP)
      else if (ident.includes('pin') || ident.includes('zip') || ident.includes('otp')) {
        const filtered = newValue.replace(/[^0-9]/g, '').slice(0, 6);
        if (filtered !== newValue) {
          newValue = filtered;
          modified = true;
        }
      }
      
      // 4. Exact 12 Digits (Aadhaar)
      else if (ident.includes('aadhaar')) {
        const filtered = newValue.replace(/[^0-9]/g, '').slice(0, 12);
        if (filtered !== newValue) {
          newValue = filtered;
          modified = true;
        }
      }
      
      // 5. Numbers only (Income, Fees, Percentages, etc.)
      else if (
        ident.includes('income') || ident.includes('fee') || ident.includes('percent') || 
        target.type === 'number'
      ) {
        const filtered = newValue.replace(/[^0-9.]/g, '');
        if (filtered !== newValue) {
          newValue = filtered;
          modified = true;
        }
      }

      // If we modified the value to strip invalid characters, we must update the React state properly
      if (modified) {
        const proto = target.tagName === 'INPUT' ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype;
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(target, newValue);
          target.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          target.value = newValue;
        }
      }
    }
  }, { capture: true }); // Use capture phase to intercept early
}
