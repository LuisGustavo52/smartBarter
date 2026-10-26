import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HistoricoService, NovoRegistroHistorico } from './historico.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('HistoricoService', () => {
  let service: HistoricoService;
  let configService: ConfigService;
  let supabaseMock: any;
  let queryBuilderMock: any;

  beforeEach(async () => {
    queryBuilderMock = {
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
      select: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      range: jest.fn().mockResolvedValue({ data: [], error: null }),
    };

    supabaseMock = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue(queryBuilderMock),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HistoricoService,
        {
          provide: SupabaseService,
          useValue: supabaseMock,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<HistoricoService>(HistoricoService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('ambiente()', () => {
    it('deve retornar "local" quando a variável AMBIENTE não estiver configurada', () => {
      jest.spyOn(configService, 'get').mockReturnValue(undefined);
      expect(service.ambiente()).toBe('local');
    });

    it('deve retornar o valor da variável AMBIENTE quando configurada', () => {
      jest.spyOn(configService, 'get').mockReturnValue('producao');
      expect(service.ambiente()).toBe('producao');
    });
  });

  describe('registrar()', () => {
    it('deve converter carteiras para minúsculas e BigInt para string', async () => {
      const registro: NovoRegistroHistorico = {
        evento: 'PROPOSTA_CRIADA',
        ocorridoEm: new Date('2026-10-23T12:00:00Z'),
        propostaId: 'f568b251-4091-4c12-9c16-834c9c6f2a89',
        produtorWallet: '0xABC123DEF456789012345678901234567890ABCD',
        fornecedorWallet: '0xDEF123DEF456789012345678901234567890DEF1',
        atorWallet: '0xABC123DEF456789012345678901234567890ABCD',
        sacas: 150n,
        blockNumber: 42n,
        tokenId: 7n,
        snapshot: {
          sacasCpr: 150n,
          totalSacas: 150,
          insumo: 'Adubo NPK',
        },
      };

      await service.registrar(registro);

      expect(queryBuilderMock.insert).toHaveBeenCalledTimes(1);
      const linhaInserida = queryBuilderMock.insert.mock.calls[0][0];

      expect(linhaInserida.produtor_wallet).toBe('0xabc123def456789012345678901234567890abcd');
      expect(linhaInserida.fornecedor_wallet).toBe('0xdef123def456789012345678901234567890def1');
      expect(linhaInserida.ator_wallet).toBe('0xabc123def456789012345678901234567890abcd');
      expect(linhaInserida.sacas).toBe('150');
      expect(linhaInserida.block_number).toBe('42');
      expect(linhaInserida.token_id).toBe('7');
      expect(linhaInserida.snapshot).toEqual({
        sacasCpr: '150',
        totalSacas: 150,
        insumo: 'Adubo NPK',
      });
    });

    it('deve ignorar erro 23505 (duplicação) em silêncio', async () => {
      queryBuilderMock.insert.mockResolvedValueOnce({
        data: null,
        error: { code: '23505', message: 'duplicate key value violates unique constraint' },
      });

      await expect(
        service.registrar({
          evento: 'PROPOSTA_CRIADA',
          ocorridoEm: new Date(),
        }),
      ).resolves.not.toThrow();
    });

    it('não deve lançar erro se o insert falhar com outro erro', async () => {
      queryBuilderMock.insert.mockResolvedValueOnce({
        data: null,
        error: { code: '50000', message: 'database connection error' },
      });

      await expect(
        service.registrar({
          evento: 'PROPOSTA_CRIADA',
          ocorridoEm: new Date(),
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('registrarOnChain()', () => {
    it('deve retornar sem chamar upsert se a lista for vazia', async () => {
      await service.registrarOnChain([]);
      expect(queryBuilderMock.upsert).not.toHaveBeenCalled();
    });

    it('deve chamar upsert com onConflict "chain_epoch,tx_hash,log_index" e ignoreDuplicates true', async () => {
      const registros: NovoRegistroHistorico[] = [
        {
          evento: 'CPR_EMITIDA',
          ocorridoEm: new Date('2026-10-23T12:00:00Z'),
          chainEpoch: '0xepoch123',
          txHash: '0xtx456',
          logIndex: 0,
          blockNumber: 10n,
          tokenId: 1n,
          sacas: 50n,
        },
      ];

      await service.registrarOnChain(registros);

      expect(queryBuilderMock.upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            evento: 'CPR_EMITIDA',
            chain_epoch: '0xepoch123',
            tx_hash: '0xtx456',
            log_index: 0,
            block_number: '10',
            token_id: '1',
            sacas: '50',
          }),
        ]),
        {
          onConflict: 'chain_epoch,tx_hash,log_index',
          ignoreDuplicates: true,
        },
      );
    });

    it('deve lançar erro se o upsert falhar', async () => {
      const err = { message: 'Falha no banco de dados', code: '42P01' };
      queryBuilderMock.upsert.mockResolvedValueOnce({
        data: null,
        error: err,
      });

      await expect(
        service.registrarOnChain([
          {
            evento: 'CPR_EMITIDA',
            ocorridoEm: new Date(),
            chainEpoch: '0xepoch123',
            txHash: '0xtx456',
            logIndex: 1,
          },
        ]),
      ).rejects.toEqual(err);
    });
  });

  describe('ultimoBlocoDoEpoch()', () => {
    it('deve retornar null se não houver linhas registradas', async () => {
      queryBuilderMock.limit.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const res = await service.ultimoBlocoDoEpoch('0xepoch123');
      expect(res).toBeNull();
      expect(queryBuilderMock.eq).toHaveBeenCalledWith('chain_epoch', '0xepoch123');
      expect(queryBuilderMock.order).toHaveBeenCalledWith('block_number', { ascending: false });
      expect(queryBuilderMock.limit).toHaveBeenCalledWith(1);
    });

    it('deve converter block_number retornado para BigInt', async () => {
      queryBuilderMock.limit.mockResolvedValueOnce({
        data: [{ block_number: '42' }],
        error: null,
      });

      const res = await service.ultimoBlocoDoEpoch('0xepoch123');
      expect(res).toBe(42n);
    });

    it('deve retornar null em caso de erro no banco de dados', async () => {
      queryBuilderMock.limit.mockResolvedValueOnce({
        data: null,
        error: { message: 'timeout', code: '57014' },
      });

      const res = await service.ultimoBlocoDoEpoch('0xepoch123');
      expect(res).toBeNull();
    });
  });

  describe('listar()', () => {
    it('deve montar o filtro .or com a carteira em minúsculas, a ordenação e o range', async () => {
      const wallet = '0xABC123DEF456789012345678901234567890ABCD';
      const wLower = wallet.toLowerCase();

      await service.listar({
        wallet,
        limit: 50,
        offset: 10,
      });

      expect(queryBuilderMock.or).toHaveBeenCalledWith(
        `produtor_wallet.eq.${wLower},fornecedor_wallet.eq.${wLower},ator_wallet.eq.${wLower}`,
      );
      expect(queryBuilderMock.order).toHaveBeenNthCalledWith(1, 'ocorrido_em', { ascending: false });
      expect(queryBuilderMock.order).toHaveBeenNthCalledWith(2, 'registrado_em', { ascending: false });
      expect(queryBuilderMock.range).toHaveBeenCalledWith(10, 59);
    });

    it('deve aplicar filtros opcionais de evento e ambiente se fornecidos', async () => {
      await service.listar({
        evento: 'CPR_EMITIDA',
        ambiente: 'local',
        limit: 100,
        offset: 0,
      });

      expect(queryBuilderMock.eq).toHaveBeenCalledWith('evento', 'CPR_EMITIDA');
      expect(queryBuilderMock.eq).toHaveBeenCalledWith('ambiente', 'local');
      expect(queryBuilderMock.range).toHaveBeenCalledWith(0, 99);
    });
  });
});
