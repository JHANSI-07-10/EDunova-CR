export function setupGlobalInputValidation() {
  document.addEventListener('input', (e) => {
    const target = e.target;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      const name = (target.name || target.placeholder || target.id || '').toLowerCase();
      
      // Attempt to get label text if available
      let labelText = '';
      if (target.labels && target.labels.length > 0) {
        labelText = target.labels[0].innerText.toLowerCase();
      } else if (target.previousSibling && target.previousSibling.innerText) {
        labelText = target.previousSibling.innerText.toLowerCase();
      } else if (target.parentElement && target.parentElement.innerText) {
        labelText = target.parentElement.innerText.toLowerCase();
      }
      
      const ident = (name + ' ' + labelText);
      let newValue = target.value;
      let modified = false;

      // 1. Text Only (Names, Religions, Nationalities, etc.)
      if (
        (ident.includes('name') || ident.includes('religion') || ident.includes('nationality') || ident.includes('city') || ident.includes('state') || ident.includes('relation') || ident.includes('occupation')) &&
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
