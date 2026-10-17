import { calcularSacas } from './calculo-sacas';

describe('calcularSacas', () => {
  it('deve calcular corretamente 10 x 12,5 => totalSacas: 125 e sacasCpr: 125', () => {
    const res = calcularSacas(10, 12.5);
    expect(res).toEqual({ totalSacas: 125, sacasCpr: 125 });
  });

  it('deve calcular corretamente 3 x 12,5 => totalSacas: 37,5 e sacasCpr: 38', () => {
    const res = calcularSacas(3, 12.5);
    expect(res).toEqual({ totalSacas: 37.5, sacasCpr: 38 });
  });

  it('deve calcular corretamente 0,7 x 10 => totalSacas: 7 e sacasCpr: 7', () => {
    const res = calcularSacas(0.7, 10);
    expect(res).toEqual({ totalSacas: 7, sacasCpr: 7 });
  });

  it('deve lançar erro quando quantidade for 0, negativa ou NaN', () => {
    expect(() => calcularSacas(0, 12.5)).toThrow('Quantidade inválida.');
    expect(() => calcularSacas(-5, 12.5)).toThrow('Quantidade inválida.');
    expect(() => calcularSacas(NaN, 12.5)).toThrow('Quantidade inválida.');
  });

  it('deve lançar erro quando preço for 0 ou negativo', () => {
    expect(() => calcularSacas(10, 0)).toThrow('O insumo não tem preço válido em sacas.');
    expect(() => calcularSacas(10, -12.5)).toThrow('O insumo não tem preço válido em sacas.');
    expect(() => calcularSacas(10, NaN)).toThrow('O insumo não tem preço válido em sacas.');
  });

  it('deve lançar erro para valores irrisórios (ex: 0,0001 x 0,0001)', () => {
    expect(() => calcularSacas(0.0001, 0.0001)).toThrow('O total de sacas deve ser maior que zero.');
  });
});
