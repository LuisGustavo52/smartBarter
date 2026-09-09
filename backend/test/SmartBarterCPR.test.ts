import { network } from "hardhat";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("SmartBarterCPR", async function () {
  const { viem, networkHelpers } = await network.create();

  async function deployContractFixture() {
    const publicClient = await viem.getPublicClient();
    const [produtor, fornecedor, outro] = await viem.getWalletClients();
    const cprContract = await viem.deployContract("SmartBarterCPR");
    
    return {
      cprContract,
      produtor,
      fornecedor,
      outro,
      publicClient,
    };
  }

  // a) produtor consegue propor uma CPR valida
  it("a) produtor consegue propor uma CPR valida", async function () {
    const { cprContract, produtor, fornecedor } = await networkHelpers.loadFixture(deployContractFixture);

    const sacas = 100n;
    const insumo = "Adubo XYZ";

    const hash = await cprContract.write.proporCPR([fornecedor.account.address, sacas, insumo], { account: produtor.account });
    
    await viem.assertions.emitWithArgs(hash, cprContract, "PropostaCriada", [
      0n, // propostaId 0
      produtor.account.address,
      fornecedor.account.address,
      sacas,
      insumo
    ]);

    const proposta = await cprContract.read.propostas([0n]);
    assert.equal(proposta[0].toLowerCase(), produtor.account.address.toLowerCase()); // produtor
    assert.equal(proposta[1].toLowerCase(), fornecedor.account.address.toLowerCase()); // fornecedor
    assert.equal(proposta[2], sacas); // sacas
    assert.equal(proposta[3], insumo); // insumo
    assert.equal(proposta[4], false); // ativa
    assert.equal(proposta[5], true); // pendente
  });

  // b) proporCPR reverte se sacas == 0 ou fornecedor == address(0)
  it("b) proporCPR reverte se sacas == 0 ou fornecedor == address(0)", async function () {
    const { cprContract, produtor, fornecedor } = await networkHelpers.loadFixture(deployContractFixture);

    const zeroAddress = "0x0000000000000000000000000000000000000000";

    await viem.assertions.revertWith(
      cprContract.write.proporCPR([zeroAddress, 100n, "Adubo XYZ"], { account: produtor.account }),
      "Fornecedor invalido"
    );

    await viem.assertions.revertWith(
      cprContract.write.proporCPR([fornecedor.account.address, 0n, "Adubo XYZ"], { account: produtor.account }),
      "Sacas deve ser maior que zero"
    );
  });

  // Helper function to propose a CPR and return its ID
  async function proposeCprFixture() {
    const { cprContract, produtor, fornecedor, outro, publicClient } = await networkHelpers.loadFixture(deployContractFixture);
    const sacas = 100n;
    const insumo = "Adubo XYZ";
    await cprContract.write.proporCPR([fornecedor.account.address, sacas, insumo], { account: produtor.account });
    const propostaId = 0n;
    return { cprContract, produtor, fornecedor, outro, publicClient, propostaId, sacas, insumo };
  }

  // c) fornecedor correto consegue aceitar a proposta
  it("c) fornecedor correto consegue aceitar a proposta", async function () {
    const { cprContract, fornecedor, propostaId, sacas, insumo } = await networkHelpers.loadFixture(proposeCprFixture);

    const hash = await cprContract.write.aceitarProposta([propostaId], { account: fornecedor.account });
    
    await viem.assertions.emitWithArgs(hash, cprContract, "PropostaAceita", [propostaId]);

    const proposta = await cprContract.read.propostas([propostaId]);
    assert.equal(proposta[4], true); // ativa
    assert.equal(proposta[5], false); // pendente
  });

  // d) uma carteira que NAO e o fornecedor da proposta tenta aceitar -> deve reverter
  it("d) uma carteira que NAO e o fornecedor da proposta tenta aceitar -> deve reverter", async function () {
    const { cprContract, outro, propostaId } = await networkHelpers.loadFixture(proposeCprFixture);

    await viem.assertions.revertWith(
      cprContract.write.aceitarProposta([propostaId], { account: outro.account }),
      "Somente fornecedor pode aceitar"
    );
  });

  // e) fornecedor consegue recusar a proposta
  it("e) fornecedor consegue recusar a proposta", async function () {
    const { cprContract, fornecedor, propostaId } = await networkHelpers.loadFixture(proposeCprFixture);

    const hash = await cprContract.write.recusarProposta([propostaId], { account: fornecedor.account });
    await viem.assertions.emitWithArgs(hash, cprContract, "PropostaRecusada", [propostaId]);

    const proposta = await cprContract.read.propostas([propostaId]);
    assert.equal(proposta[4], false); // ativa
    assert.equal(proposta[5], false); // pendente
  });

  // f) apos aceita, a proposta nao pode ser aceita/recusada de novo
  it("f) apos aceita, a proposta nao pode ser aceita/recusada de novo", async function () {
    const { cprContract, fornecedor, propostaId } = await networkHelpers.loadFixture(proposeCprFixture);

    await cprContract.write.aceitarProposta([propostaId], { account: fornecedor.account });

    await viem.assertions.revertWith(
      cprContract.write.aceitarProposta([propostaId], { account: fornecedor.account }),
      "Proposta nao esta pendente"
    );

    await viem.assertions.revertWith(
      cprContract.write.recusarProposta([propostaId], { account: fornecedor.account }),
      "Proposta nao esta pendente"
    );
  });

  // Helper function to propose and accept a CPR
  async function acceptedCprFixture() {
    const { cprContract, produtor, fornecedor, outro, publicClient, propostaId, sacas, insumo } = await networkHelpers.loadFixture(proposeCprFixture);
    await cprContract.write.aceitarProposta([propostaId], { account: fornecedor.account });
    return { cprContract, produtor, fornecedor, outro, publicClient, propostaId, sacas, insumo };
  }

  // g) Produtor consegue confirmar e o NFT é mintado pro fornecedor
  it("g) Produtor consegue confirmar e o NFT e mintado pro fornecedor", async function () {
    const { cprContract, produtor, fornecedor, propostaId, sacas, insumo } = await networkHelpers.loadFixture(acceptedCprFixture);

    const hash = await cprContract.write.confirmarRecebimentoInsumo([propostaId], { account: produtor.account });
    
    await viem.assertions.emitWithArgs(hash, cprContract, "InsumoConfirmado", [propostaId]);
    await viem.assertions.emitWithArgs(hash, cprContract, "CPREmitida", [propostaId, fornecedor.account.address, sacas, insumo]);

    const proposta = await cprContract.read.propostas([propostaId]);
    assert.equal(proposta[6], true); // insumoConfirmado

    const owner = await cprContract.read.ownerOf([propostaId]);
    assert.equal(owner.toLowerCase(), fornecedor.account.address.toLowerCase());
  });

  // h) Fornecedor (ou qualquer outra carteira) NAO consegue chamar confirmarRecebimentoInsumo
  it("h) Fornecedor ou outro NAO consegue chamar confirmarRecebimentoInsumo", async function () {
    const { cprContract, fornecedor, outro, propostaId } = await networkHelpers.loadFixture(acceptedCprFixture);

    await viem.assertions.revertWith(
      cprContract.write.confirmarRecebimentoInsumo([propostaId], { account: fornecedor.account }),
      "Somente o produtor pode confirmar"
    );
    await viem.assertions.revertWith(
      cprContract.write.confirmarRecebimentoInsumo([propostaId], { account: outro.account }),
      "Somente o produtor pode confirmar"
    );
  });

  // i) Não é possível confirmar duas vezes a mesma proposta
  it("i) Nao e possivel confirmar duas vezes a mesma proposta", async function () {
    const { cprContract, produtor, propostaId } = await networkHelpers.loadFixture(acceptedCprFixture);

    await cprContract.write.confirmarRecebimentoInsumo([propostaId], { account: produtor.account });

    await viem.assertions.revertWith(
      cprContract.write.confirmarRecebimentoInsumo([propostaId], { account: produtor.account }),
      "Insumo ja confirmado"
    );
  });

  // Helper function to propose, accept and confirm a CPR
  async function confirmedCprFixture() {
    const { cprContract, produtor, fornecedor, outro, publicClient, propostaId, sacas, insumo } = await networkHelpers.loadFixture(acceptedCprFixture);
    await cprContract.write.confirmarRecebimentoInsumo([propostaId], { account: produtor.account });
    const tokenId = propostaId;
    return { cprContract, produtor, fornecedor, outro, publicClient, tokenId };
  }

  // j) fornecedor (dono do token) consegue liquidar -> token e queimado (ownerOf deve reverter depois)
  it("j) fornecedor (dono do token) consegue liquidar -> token e queimado", async function () {
    const { cprContract, fornecedor, tokenId } = await networkHelpers.loadFixture(confirmedCprFixture);

    const hash = await cprContract.write.liquidarCPR([tokenId], { account: fornecedor.account });
    await viem.assertions.emitWithArgs(hash, cprContract, "CPRLiquidada", [tokenId]);

    const proposta = await cprContract.read.propostas([tokenId]);
    assert.equal(proposta[4], false); // ativa

    await viem.assertions.revertWithCustomErrorWithArgs(
      cprContract.read.ownerOf([tokenId]),
      cprContract,
      "ERC721NonexistentToken",
      [tokenId]
    );
  });

  // k) uma carteira diferente do fornecedor tenta liquidar -> deve reverter
  it("k) uma carteira diferente do fornecedor tenta liquidar -> deve reverter", async function () {
    const { cprContract, outro, tokenId } = await networkHelpers.loadFixture(confirmedCprFixture);

    await viem.assertions.revertWith(
      cprContract.write.liquidarCPR([tokenId], { account: outro.account }),
      "Somente o dono do token pode liquidar"
    );
  });

  // l) tentar liquidar a mesma CPR duas vezes -> deve reverter
  it("l) tentar liquidar a mesma CPR duas vezes -> deve reverter", async function () {
    const { cprContract, fornecedor, tokenId } = await networkHelpers.loadFixture(confirmedCprFixture);

    await cprContract.write.liquidarCPR([tokenId], { account: fornecedor.account });

    await viem.assertions.revertWith(
      cprContract.write.liquidarCPR([tokenId], { account: fornecedor.account }),
      "SmartBarter: CPR ja liquidada ou inexistente"
    );
  });

  // j) getPropostasPendentesPorFornecedor retorna corretamente as propostas de um fornecedor
  it("j) getPropostasPendentesPorFornecedor retorna corretamente as propostas de um fornecedor", async function () {
    const { cprContract, produtor, fornecedor, outro } = await networkHelpers.loadFixture(deployContractFixture);

    // Cria 2 propostas para 'fornecedor' e 1 para 'outro'
    await cprContract.write.proporCPR([fornecedor.account.address, 10n, "Cafe"], { account: produtor.account }); // ID 0
    await cprContract.write.proporCPR([fornecedor.account.address, 20n, "Milho"], { account: produtor.account }); // ID 1
    await cprContract.write.proporCPR([outro.account.address, 30n, "Soja"], { account: produtor.account }); // ID 2

    // Aceita a proposta ID 1 do fornecedor (para ela deixar de ser pendente)
    await cprContract.write.aceitarProposta([1n], { account: fornecedor.account });

    // Testa a leitura para 'fornecedor' (deve ter apenas a ID 0 pendente)
    const [idsFornecedor, propostasFornecedor] = await cprContract.read.getPropostasPendentesPorFornecedor([fornecedor.account.address]);
    assert.equal(idsFornecedor.length, 1);
    assert.equal(idsFornecedor[0], 0n);
    assert.equal(propostasFornecedor.length, 1);
    assert.equal(propostasFornecedor[0].insumo, "Cafe");

    // Testa a leitura para 'outro' (deve ter a ID 2 pendente)
    const [idsOutro, propostasOutro] = await cprContract.read.getPropostasPendentesPorFornecedor([outro.account.address]);
    assert.equal(idsOutro.length, 1);
    assert.equal(idsOutro[0], 2n);
    assert.equal(propostasOutro[0].insumo, "Soja");

    // Testa para a propria carteira do produtor (nao e fornecedor de nada, array vazio)
    const [idsProd, propostasProd] = await cprContract.read.getPropostasPendentesPorFornecedor([produtor.account.address]);
    assert.equal(idsProd.length, 0);
    assert.equal(propostasProd.length, 0);
  });
});
