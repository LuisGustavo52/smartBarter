import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { SupabaseService } from '../src/supabase/supabase.service';

// Fazemos mock do thirdweb/auth para simular os retornos da verificação SIWE
jest.mock('thirdweb/auth', () => ({
  verifyLoginPayload: jest.fn(),
}));
import { verifyLoginPayload } from 'thirdweb/auth';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  
  // Mock do Supabase para não sujar o banco real nos testes e2e
  const mockSupabaseClient = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    single: jest.fn(),
  };

  const mockSupabaseService = {
    getClient: () => mockSupabaseClient,
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SupabaseService)
      .useValue(mockSupabaseService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  const validPayload = {
    domain: 'localhost:3000',
    address: '0x1234567890123456789012345678901234567890',
    statement: 'Login into Smart Barter',
    uri: 'http://localhost:3000',
    version: '1',
    chainId: 1,
    nonce: 'randomnonce123',
    issuedAt: new Date().toISOString(),
  };

  const validDto = {
    nomeCompleto: 'João Produtor',
    documento: '12345678900',
    tipoUsuario: 'PRODUTOR',
    carteiraDigital: '0x1234567890123456789012345678901234567890',
    nomePropriedadeOuEmpresa: 'Fazenda Bela Vista',
    payload: validPayload,
    signature: 'valid_signature',
  };

  it('a) assinatura valida para o endereco informado -> usuario e cadastrado normalmente', async () => {
    // Configura o mock do Thirdweb para retornar válido
    (verifyLoginPayload as jest.Mock).mockResolvedValueOnce({
      valid: true,
      payload: validPayload,
    });

    // Configura o mock do Supabase para não encontrar carteira duplicada
    mockSupabaseClient.ilike.mockResolvedValueOnce({ data: [], error: null });
    // Configura o insert do Supabase para retornar sucesso
    mockSupabaseClient.single.mockResolvedValueOnce({ data: { id: 'uuid-123' }, error: null });

    const response = await request(app.getHttpServer())
      .post('/users/register')
      .send(validDto)
      .expect(201);

    expect(response.body).toHaveProperty('id', 'uuid-123');
    expect(verifyLoginPayload).toHaveBeenCalledTimes(1);
    expect(mockSupabaseClient.insert).toHaveBeenCalledTimes(1);
  });

  it('b) assinatura invalida ou de outro endereco -> requisicao rejeitada, nada e gravado no Supabase', async () => {
    // Cenário 1: Assinatura totalmente inválida
    (verifyLoginPayload as jest.Mock).mockResolvedValueOnce({
      valid: false,
    });

    await request(app.getHttpServer())
      .post('/users/register')
      .send(validDto)
      .expect(401);

    // Cenário 2: Assinatura válida, mas o payload é de OUTRA carteira
    (verifyLoginPayload as jest.Mock).mockResolvedValueOnce({
      valid: true,
      payload: { ...validPayload, address: '0x9999999999999999999999999999999999999999' },
    });

    await request(app.getHttpServer())
      .post('/users/register')
      .send(validDto)
      .expect(401);

    // O Supabase nunca deve ser chamado para inserção nesses casos
    expect(mockSupabaseClient.insert).not.toHaveBeenCalled();
  });

  it('c) tentativa de reutilizar uma assinatura ja usada antiga (replay) -> deve ser rejeitada', async () => {
    // A biblioteca thirdweb throws Error ou retorna valid: false se o payload expirou/nonce já usado
    (verifyLoginPayload as jest.Mock).mockRejectedValueOnce(new Error('Payload expired or nonce reused'));

    await request(app.getHttpServer())
      .post('/users/register')
      .send(validDto)
      .expect(401);

    expect(mockSupabaseClient.insert).not.toHaveBeenCalled();
  });

  it('d) o teste existente de "nao permitir carteiras duplicadas" continua passando', async () => {
    (verifyLoginPayload as jest.Mock).mockResolvedValueOnce({
      valid: true,
      payload: validPayload,
    });

    // Simula que a busca no Supabase encontrou um registro com essa carteira
    mockSupabaseClient.ilike.mockResolvedValueOnce({ data: [{ id: 'existente-456' }], error: null });

    const response = await request(app.getHttpServer())
      .post('/users/register')
      .send(validDto)
      .expect(409); // ConflictException

    expect(response.body.message).toBe('Já existe um usuário cadastrado com esta carteira digital.');
    expect(mockSupabaseClient.insert).not.toHaveBeenCalled();
  });
});

