// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/**
 * @title SmartBarterCPR
 * @dev Contrato de emissão de Cédula de Produto Rural (CPR) Tokenizada.
 * Representa um acordo de Barter (troca) entre um Produtor e um Fornecedor de Insumos.
 */
contract SmartBarterCPR is ERC721 {
    uint256 private _nextPropostaId;

    struct Proposta {
        address produtor;
        address fornecedor;
        uint256 sacas;
        string insumo;
        bool ativa;
        bool pendente;
    }

    mapping(uint256 => Proposta) public propostas;

    event PropostaCriada(uint256 indexed propostaId, address indexed produtor, address indexed fornecedor, uint256 sacas, string insumo);
    event PropostaAceita(uint256 indexed propostaId);
    event PropostaRecusada(uint256 indexed propostaId);
    event CPREmitida(uint256 indexed tokenId, address indexed fornecedor, uint256 sacas, string insumo);
    event CPRLiquidada(uint256 indexed tokenId);

    constructor() ERC721("SmartBarter CPR", "SBCPR") {}

    function proporCPR(address _fornecedor, uint256 _sacas, string memory _insumo) external {
        require(_fornecedor != address(0), "Fornecedor invalido");
        require(_sacas > 0, "Sacas deve ser maior que zero");

        uint256 propostaId = _nextPropostaId++;
        
        propostas[propostaId] = Proposta({
            produtor: msg.sender,
            fornecedor: _fornecedor,
            sacas: _sacas,
            insumo: _insumo,
            ativa: false,
            pendente: true
        });

        emit PropostaCriada(propostaId, msg.sender, _fornecedor, _sacas, _insumo);
    }

    function aceitarProposta(uint256 _propostaId) external {
        Proposta storage p = propostas[_propostaId];
        require(p.pendente, "Proposta nao esta pendente");
        require(msg.sender == p.fornecedor, "Somente fornecedor pode aceitar");

        p.pendente = false;
        p.ativa = true;

        _mint(msg.sender, _propostaId);

        emit PropostaAceita(_propostaId);
        emit CPREmitida(_propostaId, p.fornecedor, p.sacas, p.insumo);
    }

    function recusarProposta(uint256 _propostaId) external {
        Proposta storage p = propostas[_propostaId];
        require(p.pendente, "Proposta nao esta pendente");
        require(msg.sender == p.fornecedor, "Somente fornecedor pode recusar");

        p.pendente = false;

        emit PropostaRecusada(_propostaId);
    }

    function liquidarCPR(uint256 _tokenId) external {
        Proposta storage p = propostas[_tokenId];
        require(p.ativa, "SmartBarter: CPR ja liquidada ou inexistente");
        require(ownerOf(_tokenId) == msg.sender, "Somente o dono do token pode liquidar");

        p.ativa = false;
        _burn(_tokenId);

        emit CPRLiquidada(_tokenId);
    }
}
