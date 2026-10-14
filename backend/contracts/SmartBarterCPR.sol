// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/**
 * @title SmartBarterCPR
 * @dev Emissão e ciclo de vida de Cédulas de Produto Rural tokenizadas.
 */
contract SmartBarterCPR is ERC721 {
    uint256 private _nextTokenId;

    struct CPR {
        address produtor;
        address fornecedor;
        uint256 sacas;
        string insumo;
        string quantidadeInsumo;
        string safra;
        string tipoCafe;
        string idPropostaOffchain;
        bool aguardandoEntrega;
        bool entregue;
        bool liquidada;
    }

    mapping(uint256 => CPR) public cprs;

    event CPREmitida(
        uint256 indexed tokenId,
        address indexed produtor,
        address indexed fornecedor,
        uint256 sacas,
        string insumo,
        string quantidadeInsumo,
        string safra,
        string tipoCafe,
        string idPropostaOffchain
    );
    event EntregaConfirmada(uint256 indexed tokenId);
    event CPRLiquidada(uint256 indexed tokenId);

    constructor() ERC721("SmartBarter CPR", "SBCPR") {}

    function emitirCPR(
        address _produtor,
        uint256 _sacas,
        string memory _insumo,
        string memory _quantidadeInsumo,
        string memory _safra,
        string memory _tipoCafe,
        string memory _idPropostaOffchain
    ) external returns (uint256 tokenId) {
        require(_produtor != address(0), "Produtor invalido");
        require(_sacas > 0, "Sacas deve ser maior que zero");

        tokenId = _nextTokenId++;
        cprs[tokenId] = CPR({
            produtor: _produtor,
            fornecedor: msg.sender,
            sacas: _sacas,
            insumo: _insumo,
            quantidadeInsumo: _quantidadeInsumo,
            safra: _safra,
            tipoCafe: _tipoCafe,
            idPropostaOffchain: _idPropostaOffchain,
            aguardandoEntrega: true,
            entregue: false,
            liquidada: false
        });

        _mint(msg.sender, tokenId);

        emit CPREmitida(
            tokenId,
            _produtor,
            msg.sender,
            _sacas,
            _insumo,
            _quantidadeInsumo,
            _safra,
            _tipoCafe,
            _idPropostaOffchain
        );
    }

    function confirmarEntrega(uint256 _tokenId) external {
        CPR storage cpr = cprs[_tokenId];
        require(msg.sender == cpr.produtor, "Somente o produtor pode confirmar");
        require(cpr.aguardandoEntrega, "CPR nao esta aguardando entrega");
        require(!cpr.entregue, "Entrega ja confirmada");

        cpr.aguardandoEntrega = false;
        cpr.entregue = true;

        emit EntregaConfirmada(_tokenId);
    }

    function liquidarCPR(uint256 _tokenId) external {
        CPR storage cpr = cprs[_tokenId];
        require(cpr.entregue, "Insumo ainda nao foi entregue");
        require(ownerOf(_tokenId) == msg.sender, "Somente o dono do token pode liquidar");
        require(!cpr.liquidada, "CPR ja liquidada");

        cpr.liquidada = true;
        _burn(_tokenId);

        emit CPRLiquidada(_tokenId);
    }
}
