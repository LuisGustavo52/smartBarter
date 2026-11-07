import {
  ehUuid,
  dividirIntervalo,
  blocoInicial,
  mapearLog,
  CprDados,
} from './historico-indexer.logic';

describe('historico-indexer.logic', () => {
  describe('ehUuid()', () => {
    it('deve retornar true para UUIDs válidos (v4, minúsculo ou maiúsculo)', () => {
      expect(ehUuid('c1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d')).toBe(true);
      expect(ehUuid('C1B2C3D4-E5F6-4A7B-8C9D-0E1F2A3B4C5D')).toBe(true);
    });

    it('deve retornar false para strings inválidas', () => {
      expect(ehUuid('c1b2c3d4-e5f6-4a7b-8c9d')).toBe(false);
      expect(ehUuid('não-é-um-uuid')).toBe(false);
      expect(ehUuid('12345')).toBe(false);
    });

    it('deve retornar false para valores vazios ou não-strings', () => {
      expect(ehUuid('')).toBe(false);
      expect(ehUuid(null as any)).toBe(false);
      expect(ehUuid(undefined as any)).toBe(false);
    });
  });

  describe('dividirIntervalo()', () => {
    it('deve dividir de 0 a 4500 com tamanho 2000 em 3 intervalos inclusivos', () => {
      const intervalos = dividirIntervalo(0n, 4500n, 2000n);
      expect(intervalos).toEqual([
        [0n, 1999n],
        [2000n, 3999n],
        [4000n, 4500n],
      ]);
    });

    it('deve retornar lista vazia se "de" for maior que "ate"', () => {
      expect(dividirIntervalo(100n, 50n, 10n)).toEqual([]);
    });

    it('deve retornar um único intervalo se a faixa for menor que o tamanho', () => {
      expect(dividirIntervalo(10n, 15n, 100n)).toEqual([[10n, 15n]]);
    });

    it('deve retornar vazio se tamanho for <= 0', () => {
      expect(dividirIntervalo(0n, 10n, 0n)).toEqual([]);
    });
  });

  describe('blocoInicial()', () => {
    it('o cursor em memória deve vencer o último registrado', () => {
      expect(blocoInicial(10n, 25n)).toBe(25n);
    });

    it('deve retornar o último registrado se o cursor em memória for nulo', () => {
      expect(blocoInicial(10n, null)).toBe(10n);
      expect(blocoInicial(10n, undefined as any)).toBe(10n);
    });

    it('deve retornar 0n se ambos forem nulos', () => {
      expect(blocoInicial(null, null)).toBe(0n);
    });
  });

  describe('mapearLog()', () => {
    const timestampSegundos = 1792633859;
    const dataEsperada = new Date(timestampSegundos * 1000);
    const chainEpoch = '0xepoch123';
    const txHash = '0xtx456';
    const ator = '0xator123456789012345678901234567890123456';

    it('deve mapear CPREmitida com propostaId quando idPropostaOffchain for UUID válido', () => {
      const uuidValido = 'c1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
      const args = {
        tokenId: 1n,
        produtor: '0xprodutor',
        fornecedor: '0xfornecedor',
        sacas: 60n,
        insumo: 'Adubo',
        quantidadeInsumo: '10 sacos',
        safra: '2026',
        tipoCafe: 'Arábica',
        idPropostaOffchain: uuidValido,
      };

      const resultado = mapearLog({
        eventName: 'CPREmitida',
        args,
        txHash,
        logIndex: 0,
        blockNumber: 100n,
        blockTimestamp: timestampSegundos,
        chainEpoch,
        ator,
      });

      expect(resultado.evento).toBe('CPR_EMITIDA');
      expect(resultado.ocorridoEm).toEqual(dataEsperada);
      expect(resultado.propostaId).toBe(uuidValido);
      expect(resultado.produtorWallet).toBe('0xprodutor');
      expect(resultado.fornecedorWallet).toBe('0xfornecedor');
      expect(resultado.atorWallet).toBe(ator);
      expect(resultado.tokenId).toBe(1n);
      expect(resultado.sacas).toBe(60n);
      expect(resultado.snapshot).toMatchObject({
        insumo: 'Adubo',
        quantidadeInsumo: '10 sacos',
        idPropostaOffchain: uuidValido,
      });
    });

    it('deve mapear CPREmitida sem propostaId quando idPropostaOffchain for inválido', () => {
      const args = {
        tokenId: 2n,
        produtor: '0xprodutor',
        fornecedor: '0xfornecedor',
        sacas: 80n,
        insumo: 'Sementes',
        idPropostaOffchain: 'invalido-123',
      };

      const resultado = mapearLog({
        eventName: 'CPREmitida',
        args,
        txHash,
        logIndex: 1,
        blockNumber: 101n,
        blockTimestamp: timestampSegundos,
        chainEpoch,
        ator,
      });

      expect(resultado.propostaId).toBeUndefined();
    });

    it('deve mapear EntregaConfirmada enriquecida por cpr', () => {
      const uuidValido = 'c1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
      const cpr: CprDados = {
        produtor: '0xprodutorCPR',
        fornecedor: '0xfornecedorCPR',
        sacas: 120n,
        insumo: 'Fertilizante',
        idPropostaOffchain: uuidValido,
      };

      const resultado = mapearLog({
        eventName: 'EntregaConfirmada',
        args: { tokenId: 5n },
        txHash,
        logIndex: 2,
        blockNumber: 105n,
        blockTimestamp: timestampSegundos,
        chainEpoch,
        ator,
        cpr,
      });

      expect(resultado.evento).toBe('ENTREGA_CONFIRMADA');
      expect(resultado.tokenId).toBe(5n);
      expect(resultado.produtorWallet).toBe('0xprodutorCPR');
      expect(resultado.fornecedorWallet).toBe('0xfornecedorCPR');
      expect(resultado.sacas).toBe(120n);
      expect(resultado.propostaId).toBe(uuidValido);
    });

    it('deve mapear CPRLiquidada com snapshot de enriquecimento indisponível quando cpr for undefined', () => {
      const resultado = mapearLog({
        eventName: 'CPRLiquidada',
        args: { tokenId: 9n },
        txHash,
        logIndex: 0,
        blockNumber: 110n,
        blockTimestamp: timestampSegundos,
        chainEpoch,
        ator,
        cpr: undefined,
      });

      expect(resultado.evento).toBe('CPR_LIQUIDADA');
      expect(resultado.tokenId).toBe(9n);
      expect(resultado.produtorWallet).toBeUndefined();
      expect(resultado.snapshot).toEqual({
        enriquecimento: 'indisponivel',
        tokenId: '9',
      });
    });
  });
});
