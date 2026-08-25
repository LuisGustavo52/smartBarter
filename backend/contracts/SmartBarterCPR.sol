// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SmartBarterCPR
 * @dev Contrato de emissão de Cédula de Produto Rural (CPR) Tokenizada.
 * Representa um acordo de Barter (troca) entre um Produtor (deployer/owner)
 * e um Fornecedor de Insumos (quem recebe o NFT).
 */
contract SmartBarterCPR is ERC721, Ownable {
    uint256 private _nextTokenId;

    // Estrutura de dados que guarda os metadados on-chain de cada CPR
    struct CPRData {
        address fornecedor;
        uint256 sacas;
        string insumo;
        bool ativa;
    }

    // Mapeamento do ID do Token para os dados da CPR
    mapping(uint256 => CPRData) public cprs;

    // Eventos para facilitar o rastreamento no Front-end (Thirdweb)
    event CPREmitida(uint256 indexed tokenId, address indexed fornecedor, uint256 sacas, string insumo);
    event CPRLiquidada(uint256 indexed tokenId);

    constructor() ERC721("SmartBarter CPR", "SBCPR") Ownable(msg.sender) {}

    /**
     * @dev Função para emitir (mintar) uma nova CPR.
     * @param _fornecedor Endereço da carteira do fornecedor que receberá a garantia.
     * @param _sacas Quantidade de sacas de café dadas como garantia.
     * @param _insumo Descrição do insumo que está sendo trocado.
     */
    function emitirCPR(address _fornecedor, uint256 _sacas, string memory _insumo) public onlyOwner {
        uint256 tokenId = _nextTokenId++;
        
        // Minta o token representativo da CPR para o Fornecedor
        _mint(_fornecedor, tokenId);

        // Armazena os detalhes do contrato de Barter
        cprs[tokenId] = CPRData({
            fornecedor: _fornecedor,
            sacas: _sacas,
            insumo: _insumo,
            ativa: true
        });

        emit CPREmitida(tokenId, _fornecedor, _sacas, _insumo);
    }

    /**
     * @dev Função para liquidar a CPR. Somente o dono do contrato (validador)
     * pode declarar que a safra foi entregue e o acordo foi cumprido.
     * @param _tokenId ID único do contrato de Barter.
     */
    function liquidarCPR(uint256 _tokenId) public onlyOwner {
        require(cprs[_tokenId].ativa, "SmartBarter: CPR ja liquidada ou inexistente");
        require(ownerOf(_tokenId) != address(0), "SmartBarter: Token invalido");

        // Marca a CPR como inativa no mapeamento
        cprs[_tokenId].ativa = false;

        // Queima (burn) o token, simbolizando o fim da garantia (o ativo volta a ser livre)
        _burn(_tokenId);

        emit CPRLiquidada(_tokenId);
    }
}
