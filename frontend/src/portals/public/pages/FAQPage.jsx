import FAQAccordion from '../home/FAQAccordion'
export default function FAQPage() {
  return (
    <div className="py-12 bg-slate-50 min-h-screen">
      <h1 className="font-heading text-4xl font-bold text-center text-slate-900 mb-8 pt-10">Frequently Asked Questions</h1>
      <FAQAccordion hideTitle={true} />
    </div>
  )
}
