import { network } from "hardhat";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("SmartBarterCPR", async function () {
  const { viem, networkHelpers } = await network.create();

  async function deployContractFixture() {
    const publicClient = await viem.getPublicClient();
    const [produtor, fornecedor, outro] = await viem.getWalletClients();
    const cprContract = await viem.deployContract("SmartBarterCPR");

    return { cprContract, produtor, fornecedor, outro, publicClient };
  }

  async function emitCprFixture() {
    const { cprContract, produtor, fornecedor, outro, publicClient } =
      await networkHelpers.loadFixture(deployContractFixture);
    const dados = {
      sacas: 100n,
      insumo: "Adubo XYZ",
      quantidadeInsumo: "10 toneladas",
      safra: "2026/2027",
      tipoCafe: "Arábica Borges",
      idPropostaOffchain: "proposta-123",
    };

    const hash = await cprContract.write.emitirCPR(
      [
        produtor.account.address,
        dados.sacas,
        dados.insumo,
        dados.quantidadeInsumo,
        dados.safra,
        dados.tipoCafe,
        dados.idPropostaOffchain,
      ],
      { account: fornecedor.account },
    );

    return {
      cprContract,
      produtor,
      fornecedor,
      outro,
      publicClient,
      dados,
      tokenId: 0n,
      hash,
    };
  }

  it("emite a CPR pelo fornecedor, mintando o NFT e persistindo seus dados", async function () {
    const { cprContract, produtor, fornecedor, dados, tokenId, hash } =
      await networkHelpers.loadFixture(emitCprFixture);

    await viem.assertions.emitWithArgs(hash, cprContract, "CPREmitida", [
      tokenId,
      produtor.account.address,
      fornecedor.account.address,
      dados.sacas,
      dados.insumo,
      dados.quantidadeInsumo,
      dados.safra,
      dados.tipoCafe,
      dados.idPropostaOffchain,
    ]);

    const cpr = await cprContract.read.cprs([tokenId]);
    assert.equal(cpr[0].toLowerCase(), produtor.account.address.toLowerCase());
    assert.equal(cpr[1].toLowerCase(), fornecedor.account.address.toLowerCase());
    assert.equal(cpr[2], dados.sacas);
    assert.equal(cpr[3], dados.insumo);
    assert.equal(cpr[4], dados.quantidadeInsumo);
    assert.equal(cpr[5], dados.safra);
    assert.equal(cpr[6], dados.tipoCafe);
    assert.equal(cpr[7], dados.idPropostaOffchain);
    assert.equal(cpr[8], true);
    assert.equal(cpr[9], false);
    assert.equal(cpr[10], false);

    const owner = await cprContract.read.ownerOf([tokenId]);
    assert.equal(owner.toLowerCase(), fornecedor.account.address.toLowerCase());
  });

  it("rejeita emissão com produtor inválido ou sem sacas", async function () {
    const { cprContract, fornecedor } = await networkHelpers.loadFixture(
      deployContractFixture,
    );
    const zeroAddress = "0x0000000000000000000000000000000000000000";
    const dados = ["Insumo", "10 toneladas", "2026/2027", "Arábica", "p-1"] as const;

    await viem.assertions.revertWith(
      cprContract.write.emitirCPR(
        [zeroAddress, 100n, ...dados],
        { account: fornecedor.account },
      ),
      "Produtor invalido",
    );
    await viem.assertions.revertWith(
      cprContract.write.emitirCPR(
        [fornecedor.account.address, 0n, ...dados],
        { account: fornecedor.account },
      ),
      "Sacas deve ser maior que zero",
    );
  });

  it("confirma a entrega somente pelo produtor vinculado", async function () {
    const { cprContract, produtor, fornecedor, outro, tokenId } =
      await networkHelpers.loadFixture(emitCprFixture);

    await viem.assertions.revertWith(
      cprContract.write.confirmarEntrega([tokenId], { account: fornecedor.account }),
      "Somente o produtor pode confirmar",
    );
    await viem.assertions.revertWith(
      cprContract.write.confirmarEntrega([tokenId], { account: outro.account }),
      "Somente o produtor pode confirmar",
    );

    const hash = await cprContract.write.confirmarEntrega([tokenId], {
      account: produtor.account,
    });
    await viem.assertions.emitWithArgs(hash, cprContract, "EntregaConfirmada", [
      tokenId,
    ]);

    const cpr = await cprContract.read.cprs([tokenId]);
    assert.equal(cpr[8], false);
    assert.equal(cpr[9], true);
  });

  it("não permite confirmar a entrega duas vezes", async function () {
    const { cprContract, produtor, tokenId } =
      await networkHelpers.loadFixture(emitCprFixture);

    await cprContract.write.confirmarEntrega([tokenId], {
      account: produtor.account,
    });
    await viem.assertions.revertWith(
      cprContract.write.confirmarEntrega([tokenId], { account: produtor.account }),
      "CPR nao esta aguardando entrega",
    );
  });

  it("bloqueia a liquidação enquanto a entrega não foi confirmada", async function () {
    const { cprContract, fornecedor, tokenId } =
      await networkHelpers.loadFixture(emitCprFixture);

    await viem.assertions.revertWith(
      cprContract.write.liquidarCPR([tokenId], { account: fornecedor.account }),
      "Insumo ainda nao foi entregue",
    );
  });

  it("liquida a CPR entregue somente pelo proprietário do NFT", async function () {
    const { cprContract, produtor, fornecedor, outro, tokenId } =
      await networkHelpers.loadFixture(emitCprFixture);

    await cprContract.write.confirmarEntrega([tokenId], {
      account: produtor.account,
    });

    await viem.assertions.revertWith(
      cprContract.write.liquidarCPR([tokenId], { account: outro.account }),
      "Somente o dono do token pode liquidar",
    );

    const hash = await cprContract.write.liquidarCPR([tokenId], {
      account: fornecedor.account,
    });
    await viem.assertions.emitWithArgs(hash, cprContract, "CPRLiquidada", [
      tokenId,
    ]);

    const cpr = await cprContract.read.cprs([tokenId]);
    assert.equal(cpr[10], true);
    await viem.assertions.revertWithCustomErrorWithArgs(
      cprContract.read.ownerOf([tokenId]),
      cprContract,
      "ERC721NonexistentToken",
      [tokenId],
    );
  });
});
