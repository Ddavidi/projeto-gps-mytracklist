import { ReviewController } from '../src/controllers/ReviewController';
import { UserController } from '../src/controllers/UserController';
import { IDatabase } from '../src/interfaces/IDatabase';
import { createTestDatabase, resetDatabase } from './helpers/testDatabase';

describe('Comentários em reviews', () => {
  let db: IDatabase;
  let reviews: ReviewController;
  let alice: number;
  let bob: number;
  let reviewId: number;

  beforeAll(async () => {
    db = await createTestDatabase();
    reviews = new ReviewController(db);
  });

  beforeEach(async () => {
    await resetDatabase(db);
    const users = new UserController(db);
    alice = Number((await users.registerUser('alice', 'Senha123!', 'alice@example.com')).userId);
    bob = Number((await users.registerUser('bob', 'Senha123!', 'bob@example.com')).userId);
    reviewId = Number((await reviews.createReview(alice, 'album', 'album-1', 9, 'Muito bom')).reviewId);
  });

  afterAll(async () => {
    await db.disconnect();
  });

  it('comenta, lista em ordem e notifica a autora', async () => {
    expect((await reviews.addComment(reviewId, bob, '  Concordo!  ')).success).toBe(true);
    await reviews.addComment(reviewId, alice, 'Valeu');
    const { comments } = await reviews.getReviewComments(reviewId);
    expect(comments!.map((c: any) => [c.user_username, c.content])).toEqual([
      ['bob', 'Concordo!'],
      ['alice', 'Valeu'],
    ]);

    const notes = await db.all('SELECT user_id, actor_id, type FROM notifications ORDER BY id');
    expect(notes).toEqual([{ user_id: alice, actor_id: bob, type: 'comment' }]); // comentar na própria review não notifica
  });

  it('recusa comentário vazio', async () => {
    expect(await reviews.addComment(reviewId, bob, '   ')).toMatchObject({
      success: false,
      message: 'O comentário não pode ser vazio.',
    });
  });

  it('comentar em review inexistente falha', async () => {
    expect((await reviews.addComment(999999, bob, 'Oi')).success).toBe(false);
  });

  it('apagar a review apaga os comentários dela', async () => {
    await reviews.addComment(reviewId, bob, 'Oi');
    await reviews.deleteReview(reviewId, alice);
    const left = await db.get('SELECT COUNT(*)::int AS n FROM review_comments');
    expect(left.n).toBe(0);
  });
});
