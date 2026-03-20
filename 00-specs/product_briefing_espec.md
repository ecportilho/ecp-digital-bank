# ecp digital bank — Product Briefing & Especificação Funcional

> **Versão:** 3.0  
> **Data:** 03/03/2026  
> **Status:** Em desenvolvimento  

---

## 1. Visão Geral do Produto

O **ECP Banco Digital** é uma aplicação web de banco digital voltada para brasileiros que desejam uma experiência bancária moderna, rápida e acessível pelo navegador. O foco está em oferecer operações essenciais do dia a dia — como Pix, cartão virtual, extrato inteligente e pagamento de contas — com uma interface limpa, responsiva e de alto desempenho.

O produto é composto por dois lados: uma **API back-end** que processa regras de negócio, persiste dados e garante segurança; e um **front-end web (SPA)** que funciona como painel administrativo e interface do usuário, rodando no navegador em `http://localhost:5173/`.

---

## 2. Público-Alvo

Adultos de 20 a 45 anos, bancarizados, que utilizam smartphone e computador diariamente. São pessoas com renda formal, insatisfeitas com a burocracia e lentidão dos bancos tradicionais, e que buscam uma experiência digital-first com acesso rápido a Pix, extrato e cartão virtual.

---

## 3. Funcionalidades Principais

- **Conta digital** com saldo em tempo real
- **Pix:** enviar, receber, gerenciar chaves, agendar transferências e gerar cobranças
- **Cartão virtual** para compras online, com geração sob demanda e bloqueio instantâneo
- **Extrato inteligente** com categorização automática de transações
- **Pagamento de boletos e contas** com leitura de código de barras
- **Perfil do usuário** com dados pessoais, segurança e preferências

---

## 4. Regras de Negócio Principais

| ID | Regra | Descrição |
|----|-------|-----------|
| RN-01 | Limite diário Pix (diurno) | Máximo de R$ 5.000,00 por dia em horário comercial (6h–22h) |
| RN-02 | Limite noturno Pix | Entre 22h e 6h, máximo de R$ 1.000,00 por transação |
| RN-03 | Autenticação reforçada | Transações acima de R$ 2.000,00 exigem confirmação adicional |
| RN-04 | Saldo insuficiente | Pix e pagamentos são bloqueados se saldo < valor da operação |
| RN-05 | Chaves Pix | Máximo de 5 chaves por conta (1 CPF + 4 outras) |
| RN-06 | Cartão virtual | Limite independente do saldo da conta. Fatura fecha todo dia 25 |
| RN-07 | Soft delete | Nenhum registro de negócio é deletado fisicamente |
| RN-08 | Idempotência | Transações possuem `reference_id` para prevenir duplicidades |
| RN-09 | Valores monetários | Sempre `integer` em centavos. Front-end converte para exibição |
| RN-10 | Rate limiting | Máximo de 10 tentativas de Pix por hora por usuário |

---

*Documento gerado para o projeto ecp digital bank — v3.0*
