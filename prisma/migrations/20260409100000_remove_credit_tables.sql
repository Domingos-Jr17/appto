-- Migration: Remove Credit and CreditTransaction tables
-- Executar após a aplicaçãostar em desenvolvimento verificar que tudo funciona

-- ATENÇÃO: Esta migration elimina dados de créditos dos utilizadores
-- Se existirem dados importantes, fazer backup primeiro

-- Eliminar tabelas de credits (apenas se não houver dados importantes)
-- DROP TABLE IF EXISTS "credit_transactions";
-- DROP TABLE IF EXISTS "credits";

-- Alternativamente, apenas remover as tabelas do schema.prisma após verificação
-- Esta migration está em modo "ready to execute" 
-- Execute apenas após verificar que a app funciona sem créditos