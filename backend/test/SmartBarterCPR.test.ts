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

  // c) fornecedor correto consegue aceitar e recebe o NFT
  it("c) fornecedor correto consegue aceitar e recebe o NFT", async function () {
    const { cprContract, fornecedor, propostaId, sacas, insumo } = await networkHelpers.loadFixture(proposeCprFixture);

    const hash = await cprContract.write.aceitarProposta([propostaId], { account: fornecedor.account });
    
    await viem.assertions.emitWithArgs(hash, cprContract, "PropostaAceita", [propostaId]);
    await viem.assertions.emitWithArgs(hash, cprContract, "CPREmitida", [propostaId, fornecedor.account.address, sacas, insumo]);

    const proposta = await cprContract.read.propostas([propostaId]);
    assert.equal(proposta[4], true); // ativa
    assert.equal(proposta[5], false); // pendente

    const owner = await cprContract.read.ownerOf([propostaId]);
    assert.equal(owner.toLowerCase(), fornecedor.account.address.toLowerCase());
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
    const tokenId = propostaId;
    return { cprContract, produtor, fornecedor, outro, publicClient, tokenId };
  }

  // g) fornecedor (dono do token) consegue liquidar -> token e queimado (ownerOf deve reverter depois)
  it("g) fornecedor (dono do token) consegue liquidar -> token e queimado (ownerOf deve reverter depois)", async function () {
    const { cprContract, fornecedor, tokenId } = await networkHelpers.loadFixture(acceptedCprFixture);

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

  // h) uma carteira diferente do fornecedor tenta liquidar -> deve reverter
  it("h) uma carteira diferente do fornecedor tenta liquidar -> deve reverter", async function () {
    const { cprContract, outro, tokenId } = await networkHelpers.loadFixture(acceptedCprFixture);

    await viem.assertions.revertWith(
      cprContract.write.liquidarCPR([tokenId], { account: outro.account }),
      "Somente o dono do token pode liquidar"
    );
  });

  // i) tentar liquidar a mesma CPR duas vezes -> deve reverter
  it("i) tentar liquidar a mesma CPR duas vezes -> deve reverter", async function () {
    const { cprContract, fornecedor, tokenId } = await networkHelpers.loadFixture(acceptedCprFixture);

    await cprContract.write.liquidarCPR([tokenId], { account: fornecedor.account });

    await viem.assertions.revertWith(
      cprContract.write.liquidarCPR([tokenId], { account: fornecedor.account }),
      "SmartBarter: CPR ja liquidada ou inexistente"
    );
  });
});
