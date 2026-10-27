import {
  contarReputacao,
  LinhaHistoricoReputacao,
} from './reputacao.logic';

describe('reputacao.logic', () => {
  it('aceite e emissão da mesma proposta contam uma vez como proposta aceita', () => {
    const linhas: LinhaHistoricoReputacao[] = [
      {
        evento: 'PROPOSTA_ACEITA',
        proposta_id: 'prop-1',
        chain_epoch: null,
        token_id: null,
      },
      {
        evento: 'CPR_EMITIDA',
        proposta_id: 'prop-1',
        chain_epoch: 'epoch-1',
        token_id: 1,
      },
    ];

    const resultado = contarReputacao(linhas);

    expect(resultado.propostasAceitas).toBe(1);
    expect(resultado.propostasRecusadas).toBe(0);
    expect(resultado.cprsLiquidadas).toBe(0);
  });

  it('liquidada sem linha de aceite ainda conta como aceita', () => {
    const linhas: LinhaHistoricoReputacao[] = [
      {
        evento: 'CPR_LIQUIDADA',
        proposta_id: 'prop-2',
        chain_epoch: 'epoch-1',
        token_id: 2,
      },
    ];

    const resultado = contarReputacao(linhas);

    expect(resultado.propostasAceitas).toBe(1);
    expect(resultado.cprsLiquidadas).toBe(1);
    expect(resultado.propostasRecusadas).toBe(0);
  });

  it('duas emissões da mesma proposta contam uma', () => {
    const linhas: LinhaHistoricoReputacao[] = [
      {
        evento: 'CPR_EMITIDA',
        proposta_id: 'prop-3',
        chain_epoch: 'epoch-1',
        token_id: 3,
      },
      {
        evento: 'CPR_EMITIDA',
        proposta_id: 'prop-3',
        chain_epoch: 'epoch-1',
        token_id: 3,
      },
    ];

    const resultado = contarReputacao(linhas);

    expect(resultado.propostasAceitas).toBe(1);
    expect(resultado.cprsLiquidadas).toBe(0);
  });

  it('fallback pela chave epoch:token quando proposta_id é nulo', () => {
    const linhas: LinhaHistoricoReputacao[] = [
      {
        evento: 'CPR_EMITIDA',
        proposta_id: null,
        chain_epoch: 'epoch-1',
        token_id: 10,
      },
      {
        evento: 'CPR_LIQUIDADA',
        proposta_id: null,
        chain_epoch: 'epoch-1',
        token_id: 10,
      },
      {
        evento: 'CPR_EMITIDA',
        proposta_id: null,
        chain_epoch: 'epoch-2',
        token_id: 10,
      },
    ];

    const resultado = contarReputacao(linhas);

    // 'epoch-1:10' (aceita e liquidada) + 'epoch-2:10' (aceita) = 2 aceitas, 1 liquidada
    expect(resultado.propostasAceitas).toBe(2);
    expect(resultado.cprsLiquidadas).toBe(1);
    expect(resultado.propostasRecusadas).toBe(0);
  });

  it('recusadas distintas contam separadamente e duplicadas contam uma vez', () => {
    const linhas: LinhaHistoricoReputacao[] = [
      {
        evento: 'PROPOSTA_RECUSADA',
        proposta_id: 'prop-rec-1',
        chain_epoch: null,
        token_id: null,
      },
      {
        evento: 'PROPOSTA_RECUSADA',
        proposta_id: 'prop-rec-2',
        chain_epoch: null,
        token_id: null,
      },
      {
        evento: 'PROPOSTA_RECUSADA',
        proposta_id: 'prop-rec-1',
        chain_epoch: null,
        token_id: null,
      },
    ];

    const resultado = contarReputacao(linhas);

    expect(resultado.propostasRecusadas).toBe(2);
    expect(resultado.propostasAceitas).toBe(0);
    expect(resultado.cprsLiquidadas).toBe(0);
  });

  it('lista vazia dá zeros', () => {
    const resultado = contarReputacao([]);

    expect(resultado).toEqual({
      propostasAceitas: 0,
      propostasRecusadas: 0,
      cprsLiquidadas: 0,
    });
  });
});
