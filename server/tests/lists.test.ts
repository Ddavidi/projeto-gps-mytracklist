import { ListController } from '../src/controllers/ListController';
import { UserController } from '../src/controllers/UserController';
import { IDatabase } from '../src/interfaces/IDatabase';
import { createTestDatabase, resetDatabase } from './helpers/testDatabase';

describe('ListController', () => {
  let db: IDatabase;
  let lists: ListController;
  let users: UserController;
  let alice: number;
  let bob: number;

  const album = (id: string) => ({ itemId: id, itemType: 'album', itemName: `Álbum ${id}`, itemArtist: 'Artista' });

  beforeAll(async () => {
    db = await createTestDatabase();
    lists = new ListController(db);
    users = new UserController(db);
  });

  beforeEach(async () => {
    await resetDatabase(db);
    alice = Number((await users.registerUser('alice', 'Senha123!', 'alice@example.com')).userId);
    bob = Number((await users.registerUser('bob', 'Senha123!', 'bob@example.com')).userId);
  });

  afterAll(async () => {
    await db.disconnect();
  });

  async function newList(opts: { isPublic?: boolean; type?: string } = {}) {
    const res = await lists.createList(alice, '  Melhores de 2013  ', 'Descrição', true, opts.isPublic ?? true, opts.type ?? 'album');
    expect(res.success).toBe(true);
    return Number(res.listId);
  }

  describe('criar, editar e apagar', () => {
    it('cria a lista com título sem espaços nas pontas', async () => {
      const id = await newList();
      const { list } = await lists.getListById(id, alice);
      expect(list).toMatchObject({ title: 'Melhores de 2013', list_type: 'album', is_public: true, items: [] });
    });

    it('recusa título vazio', async () => {
      expect((await lists.createList(alice, '   ')).success).toBe(false);
    });

    it('tipo desconhecido vira "album"', async () => {
      const res = await lists.createList(alice, 'X', '', true, true, 'podcast');
      expect((await lists.getListById(Number(res.listId), alice)).list!.list_type).toBe('album');
    });

    it('só a dona edita e apaga', async () => {
      const id = await newList();
      expect((await lists.updateList(id, bob, { title: 'Hackeado' })).success).toBe(false);
      expect((await lists.deleteList(id, bob)).success).toBe(false);

      expect((await lists.updateList(id, alice, { title: 'Novo título', isPublic: false })).success).toBe(true);
      expect((await lists.getListById(id, alice)).list).toMatchObject({ title: 'Novo título', is_public: false });
      expect((await lists.deleteList(id, alice)).success).toBe(true);
      expect((await lists.getListById(id, alice)).status).toBe(404);
    });
  });

  describe('privacidade', () => {
    it('lista privada: a dona vê, outras pessoas recebem 403', async () => {
      const id = await newList({ isPublic: false });
      expect((await lists.getListById(id, alice)).success).toBe(true);
      expect((await lists.getListById(id, bob)).status).toBe(403);
      expect((await lists.getListById(id)).status).toBe(403);
    });

    it('perfil de outra pessoa mostra só as listas públicas; a dona vê todas', async () => {
      await newList({ isPublic: true });
      await newList({ isPublic: false });
      expect((await lists.getUserLists(alice, alice)).lists).toHaveLength(2);
      expect((await lists.getUserLists(alice, bob)).lists).toHaveLength(1);
      expect((await lists.getUserLists(alice)).lists).toHaveLength(1);
    });

    it('explorar mostra só listas públicas, as mais curtidas primeiro', async () => {
      const menos = await newList();
      const mais = await newList();
      await newList({ isPublic: false });
      await lists.toggleLikeList(mais, bob);
      const res = await lists.getPublicLists(10, bob);
      expect(res.lists.map((l: any) => l.id)).toEqual([mais, menos]);
      expect(res.lists[0]).toMatchObject({ likes_count: 1, is_liked: true });
    });
  });

  describe('itens', () => {
    it('adiciona em ordem, sem repetir e só do tipo da lista', async () => {
      const id = await newList();
      expect((await lists.addItemToList(id, alice, album('a1'))).success).toBe(true);
      expect((await lists.addItemToList(id, alice, album('a2'))).success).toBe(true);
      expect(await lists.addItemToList(id, alice, album('a1'))).toMatchObject({ success: false, message: 'Este item já está nesta lista.' });
      const musica = { itemId: 't1', itemType: 'track', itemName: 'Música' };
      expect((await lists.addItemToList(id, alice, musica)).message).toMatch(/exclusivamente álbuns/);

      const { list } = await lists.getListById(id, alice);
      expect(list!.items.map((i: any) => [i.item_id, i.position])).toEqual([['a1', 1], ['a2', 2]]);
    });

    it('lista do tipo playlist aceita músicas', async () => {
      const id = await newList({ type: 'playlist' });
      expect((await lists.addItemToList(id, alice, { itemId: 't1', itemType: 'track', itemName: 'Música' })).success).toBe(true);
    });

    it('outra pessoa não mexe nos itens', async () => {
      const id = await newList();
      expect((await lists.addItemToList(id, bob, album('a1'))).success).toBe(false);
      const { itemRowId } = await lists.addItemToList(id, alice, album('a1'));
      expect((await lists.removeItemFromList(id, bob, Number(itemRowId))).success).toBe(false);
      expect((await lists.getListById(id, alice)).list!.items).toHaveLength(1);
    });

    it('reordena e remove', async () => {
      const id = await newList();
      const a = Number((await lists.addItemToList(id, alice, album('a'))).itemRowId);
      const b = Number((await lists.addItemToList(id, alice, album('b'))).itemRowId);
      await lists.reorderItems(id, alice, [{ id: a, position: 2 }, { id: b, position: 1 }]);
      expect((await lists.getListById(id, alice)).list!.items.map((i: any) => i.item_id)).toEqual(['b', 'a']);

      await lists.removeItemFromList(id, alice, b);
      expect((await lists.getListById(id, alice)).list!.items.map((i: any) => i.item_id)).toEqual(['a']);
    });

    it('adição em lote ignora repetidos e itens incompletos', async () => {
      const id = await newList({ type: 'playlist' });
      const res = await lists.addItemsBulk(id, alice, [
        { itemId: 't1', itemName: 'Um' },
        { itemId: 't1', itemName: 'Um de novo' },
        { itemId: '', itemName: 'Sem id' },
        { itemId: 't2', itemName: 'Dois' },
      ]);
      expect(res).toEqual({ success: true, added: 2 });
    });
  });

  describe('curtidas', () => {
    it('curtir de novo descurte', async () => {
      const id = await newList();
      expect(await lists.toggleLikeList(id, bob)).toEqual({ success: true, liked: true });
      expect(await lists.toggleLikeList(id, bob)).toEqual({ success: true, liked: false });
    });
  });
});
