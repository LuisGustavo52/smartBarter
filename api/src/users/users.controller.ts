import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Rota de Cadastro: POST /users/register
  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    // O Body já chega validado graças ao CreateUserDto + ValidationPipe global
    return await this.usersService.registerUser(createUserDto);
  }

  // Rota de verificação de login: GET /users/wallet/:address
  @Get('wallet/:address')
  async checkWallet(@Param('address') address: string) {
    return await this.usersService.checkWalletExists(address);
  }

  // Rota auxiliar para debug: GET /users
  @Get()
  async getAll() {
    return await this.usersService.findAll();
  }
}
