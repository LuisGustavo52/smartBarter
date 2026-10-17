export interface ResultadoSacas { totalSacas: number; sacasCpr: number; }
export function calcularSacas(quantidadeComprada: number, precoUnitarioSacas: number): ResultadoSacas {
  if (!Number.isFinite(quantidadeComprada) || quantidadeComprada <= 0) throw new Error('Quantidade inválida.');
  if (!Number.isFinite(precoUnitarioSacas) || precoUnitarioSacas <= 0) throw new Error('O insumo não tem preço válido em sacas.');
  const totalSacas = Number((quantidadeComprada * precoUnitarioSacas).toFixed(4));
  const sacasCpr = Math.ceil(totalSacas);
  if (totalSacas <= 0 || sacasCpr < 1) throw new Error('O total de sacas deve ser maior que zero.');
  return { totalSacas, sacasCpr };
}
