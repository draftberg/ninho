// Redimensiona uma foto client-side antes de enviar pra IA (chat ou Importar
// extrato) — reduz o maior lado pra ~1600px e reexporta como JPEG, evitando
// estourar o limite de corpo de requisição e deixando o upload mais rápido,
// sem perder legibilidade do documento.
export async function redimensionarImagem(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const maiorLado = Math.max(bitmap.width, bitmap.height);
  const escala = Math.min(1, 1600 / maiorLado);
  const largura = Math.round(bitmap.width * escala);
  const altura = Math.round(bitmap.height * escala);

  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, largura, altura);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
}
