export default function FAQPage() {
  const qs = [
    {
      q: 'Who can join?',
      a: 'Students aged 14-19, primarily based in Kolkata. No experience needed. No resume required. Nobody here had one when they started.'
    },
    {
      q: 'Is there any fee?',
      a: 'No. AquaTerra is free to join and always will be. We fund ourselves through student-run events and ROOTS merchandise. Zero donations, zero fees.'
    },
    {
      q: "What is the difference between Community AQ and Team AQ?",
      a: 'Community AQ is the full member base (1,100+ people). Anyone can volunteer for welfare drives and community activities. Team AQ (150-200 members) is the active core: selected via application, assigned to specific departments, expected to show up consistently.'
    },
    {
      q: 'What will I actually do?',
      a: 'Depends on your department. Events team runs Paradox, Disco Diwali, and Starry Nights. Welfare team runs teaching workshops and Sundarbans relief trips. Social Media team runs the Instagram and content. Collabs team handles school and NGO partnerships. ROOTS handles the streetwear brand. You pick what fits you.'
    },
    {
      q: 'Do I get a certificate?',
      a: 'Yes. HR issues participation certificates based on hours contributed. High contributors and Heads of Departments get Letters of Recommendation. These are real documents, not templates.'
    },
    {
      q: 'Can I be part of multiple departments?',
      a: 'Yes. Many members contribute across departments at the same time. The system is flexible. If you want to run welfare drives and also design ROOTS merch, you can.'
    },
    {
      q: 'What are Welfare Points?',
      a: 'You earn 1 point per volunteering activity. Points are redeemable for discounted ROOTS merchandise and discounted entry to AQ events like Paradox.'
    },
    {
      q: 'How does the leadership structure work?',
      a: 'Community to Team AQ to Head of Department to Core to Executive Board. Progression is based on performance and consistency, not seniority. A class 10 student can lead a department if they show up.'
    },
    {
      q: 'How long does approval take?',
      a: 'Usually 24 hours. Sometimes up to 48. An HoD reviews your application personally.'
    },
    {
      q: 'What is ROOTS?',
      a: 'ROOTS is AQ\'s student-run streetwear brand. Members design, produce, and sell the merchandise. Profits go back into funding AQ\'s welfare projects and events.'
    },
  ]

  return (
    <div className="route-enter container" style={{ padding: 'clamp(28px, 5vw, 48px) var(--page-px,24px) clamp(48px, 8vw, 80px)', maxWidth: 820 }}>
      <h1 className="h-display" style={{ fontSize: 'clamp(60px, 9vw, 80px)', margin: 0, lineHeight: 0.9 }}>FAQ<span style={{ color: 'var(--pink)' }}>.</span></h1>
      <p style={{ fontSize: 18, marginTop: 12, color: 'var(--ink-2)' }}>real questions. actual answers. no corporate vagueness.</p>
      <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {qs.map((it, i) => (
          <details key={i} className="card" style={{ padding: 20, cursor: 'pointer' }}>
            <summary style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 700, listStyle: 'none', display: 'flex', justifyContent: 'space-between' }}>
              {it.q}<span style={{ color: 'var(--mint)', flexShrink: 0, marginLeft: 12 }}>+</span>
            </summary>
            <p style={{ marginTop: 12, color: 'var(--ink-2)', fontSize: 16, lineHeight: 1.65 }}>{it.a}</p>
          </details>
        ))}
      </div>
    </div>
  )
}
