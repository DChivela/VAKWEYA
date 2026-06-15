import { ArrowUpRight, MapPin, Star } from 'lucide-react';

export function ExperienceCard({
  image,
  title,
  subtitle,
  text,
  price,
  rating,
  tags = [],
  action = 'Reservar',
  actionHref = '/reservas'
}) {
  return (
    <article className="experience-card">
      <a className="experience-card__media" href={actionHref} aria-label={`${action} ${title}`}>
        <img src={image} alt={title} loading="lazy" />
        {rating && (
          <span className="rating-pill">
            <Star size={15} fill="currentColor" />
            {rating}
          </span>
        )}
      </a>
      <div className="experience-card__body">
        <div>
          <span className="card-subtitle">
            <MapPin size={14} />
            {subtitle}
          </span>
          <h3>{title}</h3>
          <p>{text}</p>
        </div>
        {tags.length > 0 && (
          <div className="tag-row">
            {tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        )}
        <div className="card-footer">
          {price && (
            <strong>
              desde <span>{price.toLocaleString('pt-AO')} Kz</span>
            </strong>
          )}
          <a className="icon-link" href={actionHref}>
            {action}
            <ArrowUpRight size={17} />
          </a>
        </div>
      </div>
    </article>
  );
}
