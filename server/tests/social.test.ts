import { SocialController } from '../src/controllers/SocialController';
import { ReviewController } from '../src/controllers/ReviewController';
import { UserController } from '../src/controllers/UserController';
import { IDatabase } from '../src/interfaces/IDatabase';
import { createTestDatabase, resetDatabase } from './helpers/testDatabase';

describe('SocialController', () => {
  let db: IDatabase;
  let social: SocialController;
  let reviews: ReviewController;
  let users: UserController;
  let alice: number;
  let bob: number;
  let carol: number;

  const makePrivate = (userId: number) => db.run('UPDATE users SET is_private = TRUE WHERE id = ?', [userId]);
  const notificationTypes = async (userId: number) =>
    (await db.all('SELECT type FROM notifications WHERE user_id = ? ORDER BY id', [userId])).map((r: any) => r.type);

  beforeAll(async () => {
    db = await createTestDatabase();
    social = new SocialController(db);
    reviews = new ReviewController(db);
    users = new UserController(db);
  });

  beforeEach(async () => {
    await resetDatabase(db);
    alice = Number((await users.registerUser('alice', 'Senha123!', 'alice@example.com')).userId);
    bob = Number((await users.registerUser('bob', 'Senha123!', 'bob@example.com')).userId);
    carol = Number((await users.registerUser('carol', 'Senha123!', 'carol@example.com')).userId);
  });

  afterAll(async () => {
    await db.disconnect();
  });

  describe('seguir', () => {
    it('segue um perfil público na hora e avisa a pessoa seguida', async () => {
      expect(await social.followUser(alice, bob)).toEqual({ success: true, status: 'following' });
      expect(await social.isFollowing(alice, bob)).toMatchObject({ isFollowing: true, isRequested: false });
      expect((await social.getFollowers(bob)).count).toBe(1);
      expect((await social.getFollowing(alice)).following.map((u: any) => u.username)).toEqual(['bob']);
      expect(await notificationTypes(bob)).toEqual(['follow']);
    });

    it('não deixa seguir a si mesmo nem usuário inexistente', async () => {
      expect((await social.followUser(alice, alice)).success).toBe(false);
      expect((await social.followUser(alice, 999999)).success).toBe(false);
    });

    it('seguir duas vezes não duplica', async () => {
      await social.followUser(alice, bob);
      expect(await social.followUser(alice, bob)).toEqual({ success: true, status: 'following' });
      expect((await social.getFollowers(bob)).count).toBe(1);
    });

    it('deixar de seguir remove; repetir avisa que não seguia', async () => {
      await social.followUser(alice, bob);
      expect((await social.unfollowUser(alice, bob)).success).toBe(true);
      expect((await social.getFollowers(bob)).count).toBe(0);
      expect((await social.unfollowUser(alice, bob)).success).toBe(false);
    });
  });

  describe('perfil privado', () => {
    beforeEach(async () => {
      await makePrivate(bob);
    });

    it('seguir vira pedido pendente, não seguidor', async () => {
      expect(await social.followUser(alice, bob)).toEqual({ success: true, status: 'requested' });
      expect(await social.isFollowing(alice, bob)).toMatchObject({ isFollowing: false, isRequested: true });
      expect((await social.getFollowers(bob)).count).toBe(0);
      expect((await social.getFollowRequests(bob)).requests.map((r: any) => r.username)).toEqual(['alice']);
      expect(await notificationTypes(bob)).toEqual(['follow_request']);
    });

    it('pedir duas vezes não duplica o pedido', async () => {
      await social.followUser(alice, bob);
      await social.followUser(alice, bob);
      expect((await social.getFollowRequests(bob)).requests).toHaveLength(1);
    });

    it('aceitar transforma o pedido em seguidor (só em uma direção) e avisa quem pediu', async () => {
      await social.followUser(alice, bob);
      expect((await social.acceptFollowRequest(bob, alice)).success).toBe(true);
      expect((await social.isFollowing(alice, bob)).isFollowing).toBe(true);
      expect((await social.isFollowing(bob, alice)).isFollowing).toBe(false);
      expect((await social.getFollowRequests(bob)).requests).toHaveLength(0);
      expect(await notificationTypes(alice)).toEqual(['follow_accepted']);
    });

    it('recusar apaga o pedido sem criar seguidor', async () => {
      await social.followUser(alice, bob);
      await social.rejectFollowRequest(bob, alice);
      expect(await social.isFollowing(alice, bob)).toMatchObject({ isFollowing: false, isRequested: false });
    });

    it('aceitar pedido inexistente falha', async () => {
      expect((await social.acceptFollowRequest(bob, carol)).success).toBe(false);
    });

    it('quem pediu pode cancelar o pedido', async () => {
      await social.followUser(alice, bob);
      expect((await social.unfollowUser(alice, bob)).success).toBe(true);
      expect((await social.getFollowRequests(bob)).requests).toHaveLength(0);
    });
  });

  describe('close friends', () => {
    it('adiciona, não duplica e remove', async () => {
      expect(await social.addCloseFriend(alice, bob)).toEqual({ success: true });
      expect(await social.addCloseFriend(alice, bob)).toEqual({ success: true, alreadyAdded: true });
      expect((await social.getCloseFriends(alice)).closeFriends.map((u: any) => u.username)).toEqual(['bob']);
      await social.removeCloseFriend(alice, bob);
      expect((await social.getCloseFriends(alice)).closeFriends).toHaveLength(0);
    });

    it('não deixa adicionar a si mesmo', async () => {
      expect((await social.addCloseFriend(alice, alice)).success).toBe(false);
    });
  });

  describe('feed e privacidade das reviews', () => {
    const review = (userId: number, itemId: string, visibility: string) =>
      reviews.createReview(userId, 'album', itemId, 8, `review ${visibility}`, undefined, undefined, undefined, { visibility });

    it('feed mostra só quem eu sigo, respeitando pública / close friends / privada', async () => {
      await review(bob, 'a-publica', 'public');
      await review(bob, 'a-close', 'close_friends');
      await review(bob, 'a-privada', 'private');
      await review(carol, 'c-publica', 'public'); // carol não é seguida por alice

      await social.followUser(alice, bob);
      let feed = (await social.getFeed(alice)).feed.map((r: any) => r.item_id);
      expect(feed).toEqual(['a-publica']);

      await social.addCloseFriend(bob, alice);
      feed = (await social.getFeed(alice)).feed.map((r: any) => r.item_id).sort();
      expect(feed).toEqual(['a-close', 'a-publica']);
    });

    it('feed pagina com limit/offset e informa se há mais', async () => {
      await social.followUser(alice, bob);
      for (let i = 0; i < 3; i++) await review(bob, `album-${i}`, 'public');
      const page1 = await social.getFeed(alice, 2, 0);
      expect(page1.feed).toHaveLength(2);
      expect(page1.hasMore).toBe(true);
      const page2 = await social.getFeed(alice, 2, 2);
      expect(page2.feed).toHaveLength(1);
      expect(page2.hasMore).toBe(false);
    });

    it('reviews de amigos de um álbum seguem as mesmas regras', async () => {
      await review(bob, 'album-x', 'close_friends');
      await social.followUser(alice, bob);
      expect((await social.getFriendsReviews(alice, 'album', 'album-x')).friendsReviews).toHaveLength(0);
      await social.addCloseFriend(bob, alice);
      expect((await social.getFriendsReviews(alice, 'album', 'album-x')).friendsReviews).toHaveLength(1);
    });

    it('reviews da comunidade escondem perfil privado de quem não segue', async () => {
      await makePrivate(bob);
      await review(bob, 'album-x', 'public');
      await review(carol, 'album-x', 'public');

      const authors = async (viewer?: number) =>
        (await reviews.getCommunityReviewsForItem('album', 'album-x', viewer)).reviews.map((r: any) => r.author_username).sort();

      expect(await authors()).toEqual(['carol']); // visitante sem login
      expect(await authors(alice)).toEqual(['carol']);
      expect(await authors(bob)).toEqual(['bob', 'carol']); // o próprio autor sempre vê a sua

      await social.followUser(alice, bob);
      await social.acceptFollowRequest(bob, alice);
      expect(await authors(alice)).toEqual(['bob', 'carol']);
    });
  });

  describe('curtidas em reviews', () => {
    it('curte e descurte uma review', async () => {
      const { reviewId } = await reviews.createReview(bob, 'album', 'album-1', 9);
      expect((await social.likeReview(alice, Number(reviewId))).success).toBe(true);
      expect((await social.getReviewLikesWithUsers(Number(reviewId))) as any).toMatchObject({ success: true });
      const likes = await db.get('SELECT COUNT(*)::int AS n FROM review_likes WHERE "reviewId" = ?', [reviewId]);
      expect(likes.n).toBe(1);
      await social.unlikeReview(alice, Number(reviewId));
      const after = await db.get('SELECT COUNT(*)::int AS n FROM review_likes WHERE "reviewId" = ?', [reviewId]);
      expect(after.n).toBe(0);
    });
  });
});
