import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "İsim en az 2 karakter olmalıdır"),
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  password: z
    .string()
    .min(8, "Şifre en az 8 karakter olmalıdır")
    .regex(/[A-Z]/, "Şifre en az bir büyük harf içermelidir")
    .regex(/[0-9]/, "Şifre en az bir rakam içermelidir"),
});

export const loginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  password: z.string().min(1, "Şifre alanı boş bırakılamaz"),
});

export const updateUserSchema = z.object({
  name: z.string().min(2, "İsim en az 2 karakter olmalıdır"),
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  role: z.enum(["ADMIN", "USER"]),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Mevcut şifrenizi giriniz"),
  newPassword: z
    .string()
    .min(8, "Yeni şifre en az 8 karakter olmalıdır")
    .regex(/[A-Z]/, "En az bir büyük harf içermelidir")
    .regex(/[0-9]/, "En az bir rakam içermelidir"),
});

export const productSchema = z.object({
  name: z.string().min(2, "Ürün adı en az 2 karakter olmalıdır"),
  sku: z.string().min(3, "SKU kodu en az 3 karakter olmalıdır"),
  description: z.string().optional(),
  price: z.coerce.number().positive("Fiyat 0'dan büyük olmalıdır"),
  stock: z.coerce.number().int().min(0, "Stok 0 veya daha büyük olmalıdır"),
  categoryId: z.string().min(1, "Lütfen bir kategori seçiniz"),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]).default("ACTIVE"),
});

export const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive("Miktar 1 veya daha fazla olmalıdır"),
});

export const createOrderSchema = z.object({
  userId: z.string().optional(),
  paymentMethod: z.enum(["CREDIT_CARD", "BANK_TRANSFER"]).default("CREDIT_CARD"),
  items: z.array(orderItemSchema).min(1, "En az 1 ürün eklemelisiniz"),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "CANCELLED"]),
});
