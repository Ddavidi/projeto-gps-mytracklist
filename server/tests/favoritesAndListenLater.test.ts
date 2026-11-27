import { FavoriteController } from '../src/controllers/FavoriteController';
import { ListenLaterController } from '../src/controllers/ListenLaterController';
import { SocialController } from '../src/controllers/SocialController';
import { UserController } from '../src/controllers/UserController';
import { IDatabase } from '../src/interfaces/IDatabase';
import { createTestDatabase, resetDatabase } from './helpers/testDatabase';

let db: IDatabase;
let alice: number;
let bob: number;

beforeAll(async () => {
  db = await createTestDatabase();
});

beforeEach(async () => {
  await resetDatabase(db);
  const users = new UserController(db);
  alice = Number((await users.registerUser('alice', 'Senha123!', 'alice@example.com')).userId);
  bob = Number((await users.registerUser('bob', 'Senha123!', 'bob@example.com')).userId);
});

afterAll(async () => {
  await db.disconnect();
});

describe('FavoriteController — favoritos do perfil', () => {
  const fav = () => new FavoriteController(db);
  const ids = async (userId: number, type: string) =>
    (await fav().getUserFavorites(userId)).favorites!.filter((f: any) => f.item_type === type).map((f: any) => f.item_id);

  it('adiciona na ordem em que foram escolhidos', async () => {
    await fav().addFavorite(alice, 'album', 'a1');
    await fav().addFavorite(alice, 'album', 'a2');
    expect(await ids(alice, 'album')).toEqual(['a1', 'a2']);
  });

  it('limite de 5 por categoria (as outras categorias continuam livres)', async () => {
    for (let i = 1; i <= 5; i++) expect((await fav().addFavorite(alice, 'album', `a${i}`)).success).toBe(true);
    expect((await fav().addFavorite(alice, 'album', 'a6')).message).toMatch(/limite de 5/);
    expect((await fav().addFavorite(alice, 'track', 't1')).success).toBe(true);
  });

  it('não repete o mesmo item', async () => {
    await fav().addFavorite(alice, 'album', 'a1');
    expect(await fav().addFavorite(alice, 'album', 'a1')).toMatchObject({
      success: false,
      message: 'Este item já está nos seus favoritos.',
    });
  });

  it('reordena e remove', async () => {
    for (const id of ['a1', 'a2', 'a3']) await fav().addFavorite(alice, 'album', id);
    await fav().reorderFavorites(alice, 'album', ['a3', 'a1', 'a2']);
    expect(await ids(alice, 'album')).toEqual(['a3', 'a1', 'a2']);
    await fav().removeFavorite(alice, 'album', 'a1');
    expect(await ids(alice, 'album')).toEqual(['a3', 'a2']);
  });

  it('favoritos de uma pessoa não aparecem para outra e não são mexidos por ela', async () => {
    await fav().addFavorite(alice, 'album', 'a1');
    await fav().removeFavorite(bob, 'album', 'a1');
    expect(await ids(alice, 'album')).toEqual(['a1']);
    expect(await ids(bob, 'album')).toEqual([]);
  });
});

describe('ListenLaterController — ouvir depois', () => {
  const ll = () => new ListenLaterController(db);
  const item = (id: string) => ({ itemId: id, itemType: 'album', itemName: `Álbum ${id}` });

  it('salva em ordem, sem duplicar, e informa se já está salvo', async () => {
    await ll().addItem(alice, item('a1'));
    await ll().addItem(alice, item('a2'));
    expect(await ll().addItem(alice, item('a1'))).toEqual({ success: true, alreadyExists: true });
    expect((await ll().checkItem(alice, 'album', 'a1')).saved).toBe(true);
    expect((await ll().checkItem(alice, 'album', 'zzz')).saved).toBe(false);
    const { items } = await ll().getUserItems(alice, alice);
    expect(items!.map((i: any) => i.item_id)).toEqual(['a1', 'a2']);
  });

  it('reordena e remove; outra pessoa não reordena a lista alheia', async () => {
    await ll().addItem(alice, item('a1'));
    await ll().addItem(alice, item('a2'));
    const [first, second] = (await ll().getUserItems(alice, alice)).items!;
    await ll().reorderItems(bob, [{ id: first.id, position: 9 }]);
    await ll().reorderItems(alice, [{ id: first.id, position: 2 }, { id: second.id, position: 1 }]);
    expect((await ll().getUserItems(alice, alice)).items!.map((i: any) => i.item_id)).toEqual(['a2', 'a1']);
    await ll().removeItem(alice, 'album', 'a2');
    expect((await ll().getUserItems(alice, alice)).items!.map((i: any) => i.item_id)).toEqual(['a1']);
  });

  it('visibilidade: pública, só close friends e privada', async () => {
    await ll().addItem(alice, item('a1'));
    const visibleTo = async (viewer?: number) => {
      const res = await ll().getUserItems(alice, viewer);
      return res.isPrivate ? 'bloqueado' : res.items!.length;
    };

    expect(await visibleTo(bob)).toBe(1); // padrão: pública
    expect(await visibleTo(undefined)).toBe(1);

    await ll().updateVisibility(alice, 'close_friends');
    expect(await visibleTo(bob)).toBe('bloqueado');
    expect(await visibleTo(undefined)).toBe('bloqueado');
    await new SocialController(db).addCloseFriend(alice, bob);
    expect(await visibleTo(bob)).toBe(1);

    await ll().updateVisibility(alice, 'private');
    expect(await visibleTo(bob)).toBe('bloqueado');
    expect(await visibleTo(alice)).toBe(1); // a dona sempre vê
  });

  it('visibilidade inválida vira pública', async () => {
    expect(await ll().updateVisibility(alice, 'qualquer' as any)).toMatchObject({ success: true, visibility: 'public' });
  });
});
