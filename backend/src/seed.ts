import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Iniciando Seed...');

    // Criar usuário admin
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@burgerpizzahouse.com' },
        update: {},
        create: {
            name: 'Administrador',
            email: 'admin@burgerpizzahouse.com',
            password: adminPassword,
            role: 'ADMIN'
        }
    });

    console.log('✅ Admin criado:', admin.email);

    // Criar ingredientes
    await Promise.all([
        prisma.ingredient.upsert({
            where: { id: 'ing-1' },
            update: {},
            create: {
                id: 'ing-1',
                name: 'Farinha',
                unit: 'kg',
                currentStock: 50,
                minStock: 10,
                costPerUnit: 3.50
            }
        }),
        prisma.ingredient.upsert({
            where: { id: 'ing-2' },
            update: {},
            create: {
                id: 'ing-2',
                name: 'Queijo Mussarela',
                unit: 'kg',
                currentStock: 30,
                minStock: 8,
                costPerUnit: 25.00
            }
        }),
        prisma.ingredient.upsert({
            where: { id: 'ing-3' },
            update: {},
            create: {
                id: 'ing-3',
                name: 'Molho de Tomate',
                unit: 'L',
                currentStock: 20,
                minStock: 5,
                costPerUnit: 8.00
            }
        }),
        prisma.ingredient.upsert({
            where: { id: 'ing-4' },
            update: {},
            create: {
                id: 'ing-4',
                name: 'Carne Moída',
                unit: 'kg',
                currentStock: 15,
                minStock: 5,
                costPerUnit: 32.00
            }
        })
    ]);

    console.log('✅ Ingredientes criados');

    // Criar produtos
    await Promise.all([
        prisma.product.upsert({
            where: { id: 'prod-1' },
            update: {},
            create: {
                id: 'prod-1',
                name: 'Pizza Margherita',
                description: 'Molho de tomate, mussarela, manjericão',
                price: 45.90,
                cost: 15.00,
                category: 'PIZZA',
                preparationTime: 20,
                ingredients: {
                    create: [
                        { ingredientId: 'ing-1', quantity: 0.5, unit: 'kg' },
                        { ingredientId: 'ing-2', quantity: 0.3, unit: 'kg' },
                        { ingredientId: 'ing-3', quantity: 0.2, unit: 'L' }
                    ]
                }
            }
        }),
        prisma.product.upsert({
            where: { id: 'prod-2' },
            update: {},
            create: {
                id: 'prod-2',
                name: 'Pizza Calabresa',
                description: 'Molho de tomate, mussarela, calabresa, cebola',
                price: 49.90,
                cost: 18.00,
                category: 'PIZZA',
                preparationTime: 20
            }
        }),
        prisma.product.upsert({
            where: { id: 'prod-3' },
            update: {},
            create: {
                id: 'prod-3',
                name: 'Hambúrguer Clássico',
                description: 'Pão, carne, queijo, alface, tomate',
                price: 32.90,
                cost: 12.00,
                category: 'HAMBURGUER',
                preparationTime: 15,
                ingredients: {
                    create: [
                        { ingredientId: 'ing-2', quantity: 0.1, unit: 'kg' },
                        { ingredientId: 'ing-4', quantity: 0.2, unit: 'kg' }
                    ]
                }
            }
        })
    ]);

    console.log('✅ Produtos criados');
    console.log('🎉 Seed concluída com sucesso!');
}

main()
    .catch((e) => {
        console.error('❌ Erro no seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
