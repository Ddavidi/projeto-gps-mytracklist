import { ReviewController } from '../src/controllers/ReviewController';
import { UserController } from '../src/controllers/UserController';
import { IDatabase } from '../src/interfaces/IDatabase';
import { createTestDatabase, resetDatabase } from './helpers/testDatabase';

describe('ReviewController', () => {
  let db: IDatabase;
  let reviews: ReviewController;
  let users: UserController;
  let aliceId: number;
  let bobId: number;

  beforeAll(async () => {
    db = await createTestDatabase();
    reviews = new ReviewController(db);
    users = new UserController(db);
  });

  beforeEach(async () => {
    await resetDatabase(db);
    aliceId = Number((await users.registerUser('alice', 'Senha123!', 'alice@example.com')).userId);
    bobId = Number((await users.registerUser('bob', 'Senha123!', 'bob@example.com')).userId);
  });

  afterAll(async () => {
    await db.disconnect();
  });

  describe('createReview', () => {
    it('salva a avaliação com a nota exata escolhida', async () => {
      const result = await reviews.createReview(aliceId, 'album', 'album-1', 9, 'Muito bom', 'Sempiternal');
      expect(result.success).toBe(true);

      const saved = await reviews.getReviewForItem(aliceId, 'album', 'album-1');
      expect(Number(saved.review.rating)).toBe(9);
      expect(saved.review.review_text).toBe('Muito bom');
    });

    it.each([0, 10])('aceita a nota limite %i', async (rating) => {
      const result = await reviews.createReview(aliceId, 'album', `album-${rating}`, rating);
      expect(result.success).toBe(true);
    });

    it.each([-1, 11])('recusa a nota fora do intervalo %i', async (rating) => {
      const result = await reviews.createReview(aliceId, 'album', 'album-1', rating);
      expect(result).toMatchObject({ success: false, message: 'A avaliação deve estar entre 0 e 10.' });
    });

    it('recusa tipo de item inválido', async () => {
      const result = await reviews.createReview(aliceId, 'podcast' as any, 'x', 5);
      expect(result.success).toBe(false);
    });

    it('não deixa avaliar o mesmo item duas vezes', async () => {
      await reviews.createReview(aliceId, 'album', 'album-1', 7);
      const result = await reviews.createReview(aliceId, 'album', 'album-1', 8);
      expect(result).toMatchObject({ success: false, message: 'Já avaliou este item.' });
    });
  });

  describe('updateReview', () => {
    it('troca a nota (ex.: de 9 para 10)', async () => {
      const { reviewId } = await reviews.createReview(aliceId, 'album', 'album-1', 9);
      const result = await reviews.updateReview(Number(reviewId), aliceId, 10, 'Obra-prima');
      expect(result.success).toBe(true);

      const saved = await reviews.getReviewForItem(aliceId, 'album', 'album-1');
      expect(Number(saved.review.rating)).toBe(10);
    });

    it('não deixa outra pessoa editar a avaliação', async () => {
      const { reviewId } = await reviews.createReview(aliceId, 'album', 'album-1', 9);
      const result = await reviews.updateReview(Number(reviewId), bobId, 1);
      expect(result.success).toBe(false);

      const saved = await reviews.getReviewForItem(aliceId, 'album', 'album-1');
      expect(Number(saved.review.rating)).toBe(9);
    });

    it('recusa nota fora do intervalo', async () => {
      const { reviewId } = await reviews.createReview(aliceId, 'album', 'album-1', 9);
      const result = await reviews.updateReview(Number(reviewId), aliceId, 12);
      expect(result.success).toBe(false);
    });
  });

  describe('deleteReview', () => {
    it('apaga apenas a avaliação da própria pessoa', async () => {
      const { reviewId } = await reviews.createReview(aliceId, 'album', 'album-1', 9);
      expect((await reviews.deleteReview(Number(reviewId), bobId)).success).toBe(false);
      expect((await reviews.deleteReview(Number(reviewId), aliceId)).success).toBe(true);
      const saved = await reviews.getReviewForItem(aliceId, 'album', 'album-1');
      expect(saved.review).toBeFalsy();
    });
  });

  describe('getItemStats', () => {
    it('calcula média, total e distribuição só com avaliações públicas', async () => {
      await reviews.createReview(aliceId, 'album', 'album-1', 10);
      await reviews.createReview(bobId, 'album', 'album-1', 7);
      const carolId = Number((await users.registerUser('carol', 'Senha123!', 'carol@example.com')).userId);
      await reviews.createReview(carolId, 'album', 'album-1', 1, undefined, undefined, undefined, undefined, {
        visibility: 'private',
      });

      const result = await reviews.getItemStats('album', 'album-1');
      expect(result.success).toBe(true);
      expect(result.stats).toMatchObject({ averageScore: 8.5, totalReviews: 2 });
      expect(result.stats!.distribution[10]).toBe(1);
      expect(result.stats!.distribution[7]).toBe(1);
      expect(result.stats!.distribution[1]).toBe(0);
    });

    it('devolve zeros para item sem avaliações', async () => {
      const result = await reviews.getItemStats('album', 'sem-avaliacoes');
      expect(result.stats).toMatchObject({ averageScore: 0, totalReviews: 0 });
    });
  });
});
