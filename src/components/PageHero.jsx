export function PageHero({ eyebrow, title, text, image }) {
  return (
    <section className="page-hero">
      <img src={image} alt="" aria-hidden="true" />
      <div className="page-hero__overlay" />
      <div className="shell page-hero__content">
        <span className="hero__kicker">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
    </section>
  );
}
