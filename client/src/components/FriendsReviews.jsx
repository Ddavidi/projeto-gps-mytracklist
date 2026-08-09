import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getFriendsReviews } from '../services/social';

/**
 * Componente "Following" estilo AniList.
 * Exibe as avaliações de amigos (utilizadores seguidos) para um item específico.
 *
 * Props:
 *   - itemType: 'track' | 'album' | 'artist'
 *   - itemId: string (ID do Spotify)
 */
function FriendsReviews({ itemType, itemId }) {
  const { isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !itemId || !itemType) return;

    setLoading(true);
    getFriendsReviews(itemType, itemId)
      .then(setReviews)
      .finally(() => setLoading(false));
  }, [isAuthenticated, itemType, itemId]);

  // Não exibe nada se: não logado, carregando com dados vazios, ou sem amigos com review
  if (!isAuthenticated || (!loading && reviews.length === 0)) return null;

  return (
    <div className="friends-reviews">
      <h3 className="friends-reviews__title">Following</h3>

      {loading ? (
        <div className="friends-reviews__loading">
          {[1, 2, 3].map((i) => (
            <div key={i} className="friends-reviews__skeleton" />
          ))}
        </div>
      ) : (
        <ul className="friends-reviews__list">
          {reviews.map((review) => (
            <li key={review.id} className="friends-reviews__item">
              {/* Avatar */}
              <Link
                to={`/user/${review.author_username}`}
                className="friends-reviews__avatar"
                title={review.author_username}
              >
                {(review.author_name || review.author_username || '?')[0].toUpperCase()}
              </Link>

              {/* Info */}
              <div className="friends-reviews__info">
                <Link
                  to={`/user/${review.author_username}`}
                  className="friends-reviews__username"
                >
                  {review.author_username}
                </Link>

                {review.review_text && (
                  <p className="friends-reviews__text" title={review.review_text}>
                    {review.review_text.length > 80
                      ? `${review.review_text.slice(0, 80)}…`
                      : review.review_text}
                  </p>
                )}
              </div>

              {/* Rating */}
              <div className="friends-reviews__rating">
                <span className="friends-reviews__score">{review.rating}</span>
                <span className="friends-reviews__score-max">/10</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default FriendsReviews;
