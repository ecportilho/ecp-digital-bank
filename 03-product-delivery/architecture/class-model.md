# ECP Digital Bank — Class Model

**Agent:** Software Architect
**Artifact:** Class Model
**Phase:** 03 — Product Delivery
**Date:** 2026-03-04
**Version:** 1.0.0

---

## Overview

This document describes the full class model of ECP Digital Bank, organized by Bounded Context. Each class is annotated with its DDD stereotype (`«AggregateRoot»`, `«Entity»`, `«ValueObject»`, `«Enum»`, `«Service»`, `«Repository»`). All attributes, methods, and relationships are listed.

**Conventions:**
- `+` = public
- `-` = private
- `#` = protected
- `[cents]` = stored as INTEGER in SQLite, represents monetary value in BRL centavos
- `?` = nullable / optional

---

## Bounded Context: Identity & Access (BC-01)

### «AggregateRoot» User

**Table:** `users`

| Attribute | Type | Constraints |
|-----------|------|-------------|
| `id` | `number` | PK, auto-increment |
| `name` | `string` | NOT NULL |
| `email` | `Email` (VO) | NOT NULL, UNIQUE |
| `cpf` | `CPF` (VO) | NOT NULL, UNIQUE |
| `passwordHash` | `HashedPassword` (VO) | NOT NULL |
| `phone` | `string?` | nullable |
| `salaryDay` | `SalaryDay` (VO)? | nullable, 1–31 |
| `createdAt` | `Date` | NOT NULL |
| `updatedAt` | `Date` | NOT NULL |
| `deletedAt` | `Date?` | soft delete |

**Methods:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `create` | `static create(name, email, cpf, password): User` | Factory method. Validates all invariants. |
| `changePassword` | `changePassword(currentHash, newPassword): void` | Validates current password, hashes new one. |
| `updateProfile` | `updateProfile(name?, phone?, salaryDay?): void` | Updates mutable profile fields. |
| `isActive` | `isActive(): boolean` | Returns `deletedAt === null`. |
| `softDelete` | `softDelete(): void` | Sets `deletedAt = now()`. |

**Relationships:**
- `User` 1 → 1 `Account` (BC-02) — one user has exactly one account
- `User` 1 → 0..5 `PixKey` (BC-03) — one user can have up to 5 Pix keys
- `User` 1 → 0..1 `Card` (BC-04) — one user can have one virtual card
- `User` 1 → * `Notification` (BC-05) — one user has many notifications

**Domain Events Emitted:**
- `UserRegistered` — on successful creation
- `UserPasswordChanged` — on successful password change
- `UserProfileUpdated` — on profile update

---

### «ValueObject» Email

| Attribute | Type | Description |
|-----------|------|-------------|
| `value` | `string` | Lowercase, RFC 5322 format |

**Methods:**

| Method | Signature |
|--------|-----------|
| `create` | `static create(raw: string): Email` |
| `equals` | `equals(other: Email): boolean` |
| `toString` | `toString(): string` |

**Invariants:**
- Must match RFC 5322 email regex
- Normalized to lowercase on creation
- Immutable after creation

---

### «ValueObject» CPF

| Attribute | Type | Description |
|-----------|------|-------------|
| `value` | `string` | 11 digits, no formatting |

**Methods:**

| Method | Signature |
|--------|-----------|
| `create` | `static create(raw: string): CPF` |
| `format` | `format(): string` — returns `XXX.XXX.XXX-XX` |
| `equals` | `equals(other: CPF): boolean` |
| `isValid` | `static isValid(cpf: string): boolean` |

**Invariants:**
- 11 numeric digits
- Passes modulo-11 checksum algorithm (BACEN spec)
- Strips dots and hyphens before storage
- Immutable after creation

---

### «ValueObject» HashedPassword

| Attribute | Type | Description |
|-----------|------|-------------|
| `hash` | `string` | bcryptjs hash |

**Methods:**

| Method | Signature |
|--------|-----------|
| `create` | `static async create(plaintext: string): HashedPassword` |
| `verify` | `async verify(plaintext: string): boolean` |

**Invariants:**
- Original password must be ≥ 8 characters
- Hash generated with bcryptjs, saltRounds = 10
- `hash` value is NEVER serialized to JSON responses

---

### «ValueObject» SalaryDay

| Attribute | Type | Description |
|-----------|------|-------------|
| `day` | `number` | Integer 1–31 |

**Methods:**

| Method | Signature |
|--------|-----------|
| `create` | `static create(day: number): SalaryDay` |
| `resolveForMonth` | `resolveForMonth(month: number, year: number): Date` |

**Invariants:**
- `day` must be between 1 and 31 inclusive
- `resolveForMonth` adjusts to last day of month when day doesn't exist (e.g., day=31 in February → Feb 28/29)

---

### «ValueObject» JwtToken

| Attribute | Type | Description |
|-----------|------|-------------|
| `token` | `string` | Signed JWT string |
| `userId` | `number` | Subject claim |
| `expiresAt` | `Date` | Expiration timestamp |

**Methods:**

| Method | Signature |
|--------|-----------|
| `create` | `static create(userId: number, secret: string): JwtToken` |
| `verify` | `static verify(token: string, secret: string): JwtToken` |
| `isExpired` | `isExpired(): boolean` |

---

## Bounded Context: Banking Core (BC-02)

### «AggregateRoot» Account

**Table:** `accounts`

| Attribute | Type | Constraints |
|-----------|------|-------------|
| `id` | `number` | PK, auto-increment |
| `userId` | `number` | NOT NULL, UNIQUE, FK → users.id |
| `balance` | `Money` (VO) | NOT NULL, DEFAULT 0, CHECK ≥ 0 [cents] |
| `accountNumber` | `string` | NOT NULL, UNIQUE, 7 digits |
| `agency` | `string` | NOT NULL, DEFAULT '0001' |
| `createdAt` | `Date` | NOT NULL |
| `updatedAt` | `Date` | NOT NULL |

**Methods:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `create` | `static create(userId: number): Account` | Factory. Generates account number. |
| `debit` | `debit(amount: Money, desc: string, type: TransactionType, idempotencyKey?: string): Transaction` | Validates balance, creates debit Transaction atomically. |
| `credit` | `credit(amount: Money, desc: string, type: TransactionType, idempotencyKey?: string): Transaction` | Creates credit Transaction atomically. |
| `getBalance` | `getBalance(): Money` | Returns current balance. |
| `getTransactions` | `getTransactions(filters: TransactionFilters): Transaction[]` | Returns paginated transaction list. |
| `getSummary` | `getSummary(start: Date, end: Date): AccountSummary` | Aggregated spending report. |

**Relationships:**
- `Account` 1 → * `Transaction` (child entity)

**Domain Events Emitted:**
- `AccountCreated`
- `BalanceDebited`
- `BalanceCredited`
- `TransactionCategorized`

---

### «Entity» Transaction

**Table:** `transactions`

| Attribute | Type | Constraints |
|-----------|------|-------------|
| `id` | `number` | PK, auto-increment |
| `accountId` | `number` | NOT NULL, FK → accounts.id |
| `type` | `TransactionType` (Enum) | NOT NULL |
| `amount` | `Money` (VO) | NOT NULL, CHECK > 0 [cents] |
| `direction` | `TransactionDirection` (Enum) | NOT NULL |
| `description` | `string` | NOT NULL |
| `category` | `TransactionCategory?` (Enum) | nullable |
| `referenceId` | `string?` | nullable — links to source entity |
| `idempotencyKey` | `string?` | nullable, UNIQUE |
| `status` | `TransactionStatus` (Enum) | NOT NULL, DEFAULT 'completed' |
| `createdAt` | `Date` | NOT NULL, immutable |
| `deletedAt` | `Date?` | soft delete (reversals only) |

**Invariants:**
- `amount` is always positive (direction conveys the sign)
- `createdAt` is immutable after creation
- Transactions with `status = 'completed'` cannot be updated (only reversed via new transaction)
- `idempotencyKey` is globally unique when present

---

### «ValueObject» Money

| Attribute | Type | Description |
|-----------|------|-------------|
| `cents` | `number` | Integer, non-negative |

**Methods:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `fromCents` | `static fromCents(cents: number): Money` | |
| `fromBRL` | `static fromBRL(brl: string): Money` | Parses '1234.56' → 123456 cents |
| `toBRL` | `toBRL(): string` | Returns '1234.56' |
| `toDisplay` | `toDisplay(): string` | Returns 'R$ 1.234,56' |
| `add` | `add(other: Money): Money` | Returns new Money |
| `subtract` | `subtract(other: Money): Money` | Returns new Money (throws if negative) |
| `isGreaterThan` | `isGreaterThan(other: Money): boolean` | |
| `equals` | `equals(other: Money): boolean` | |

**Invariants:**
- `cents` must be a non-negative integer
- Arithmetic operations always return new immutable Money instances
- `subtract` throws `DomainError` if result would be negative

---

### «Enum» TransactionType

| Value | Description |
|-------|-------------|
| `pix_sent` | Pix transfer sent |
| `pix_received` | Pix transfer received |
| `card_purchase` | Virtual card purchase (recorded in Account for ledger) |
| `boleto_payment` | Boleto/bank slip payment |
| `deposit` | Incoming TED/DOC deposit |
| `fee` | Bank fee |
| `reversal` | Transaction reversal credit |

---

### «Enum» TransactionDirection

| Value | Description |
|-------|-------------|
| `credit` | Money entering the account (balance increases) |
| `debit` | Money leaving the account (balance decreases) |

---

### «Enum» TransactionStatus

| Value | Description |
|-------|-------------|
| `pending` | Operation initiated, not yet settled |
| `completed` | Successfully settled |
| `failed` | Operation failed (e.g., insufficient balance) |
| `reversed` | Reversed by a subsequent transaction |

---

### «ValueObject» TransactionCategory

| Value | Description |
|-------|-------------|
| `alimentacao` | Food & beverages |
| `transporte` | Transport & fuel |
| `saude` | Health & medical |
| `educacao` | Education |
| `lazer` | Entertainment |
| `moradia` | Housing & utilities |
| `assinaturas` | Subscriptions |
| `pix` | Pix transfers |
| `pagamentos` | Bill payments |
| `outros` | Uncategorized / other |

---

### «ValueObject» AccountSummary

| Attribute | Type | Description |
|-----------|------|-------------|
| `period.start` | `Date` | Summary period start |
| `period.end` | `Date` | Summary period end |
| `totalCredit` | `Money` | Sum of all credits |
| `totalDebit` | `Money` | Sum of all debits |
| `netBalance` | `Money` | totalCredit - totalDebit |
| `byCategory` | `CategoryBreakdown[]` | Per-category totals |

---

## Bounded Context: Pix (BC-03)

### «AggregateRoot» PixKey

**Table:** `pix_keys`

| Attribute | Type | Constraints |
|-----------|------|-------------|
| `id` | `number` | PK, auto-increment |
| `userId` | `number` | NOT NULL, FK → users.id |
| `accountId` | `number` | NOT NULL, FK → accounts.id |
| `keyType` | `PixKeyType` (Enum) | NOT NULL |
| `keyValue` | `PixKeyValue` (VO) | NOT NULL, UNIQUE globally |
| `isActive` | `boolean` | NOT NULL, DEFAULT true |
| `createdAt` | `Date` | NOT NULL |
| `deletedAt` | `Date?` | soft delete |

**Methods:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `register` | `static register(userId, accountId, keyType, keyValue): PixKey` | Factory. Validates uniqueness and 5-key limit. |
| `delete` | `delete(): void` | Soft delete. Sets `deletedAt` and `isActive = false`. |
| `generateQRCode` | `generateQRCode(amount?: Money): string` | Returns base64 QR code image or SVG string. |

**Relationships:**
- `PixKey` is owned by `User` (BC-01) — via `userId`

**Domain Events Emitted:**
- `PixKeyClaimed`
- `PixKeyDeleted`
- `PixTransferInitiated`

---

### «Enum» PixKeyType

| Value | Description |
|-------|-------------|
| `cpf` | Brazilian taxpayer ID |
| `email` | Email address |
| `phone` | Mobile phone (+55 format) |
| `evp` | Random UUID key (Endereço Virtual de Pagamentos) |

---

### «ValueObject» PixKeyValue

| Attribute | Type | Description |
|-----------|------|-------------|
| `value` | `string` | Normalized key value |
| `type` | `PixKeyType` | Used for validation |

**Methods:**

| Method | Signature |
|--------|-----------|
| `create` | `static create(type: PixKeyType, raw: string): PixKeyValue` |
| `validate` | `private validate(): void` |
| `normalize` | `private normalize(): string` |

**Invariants:**
- `cpf`: passes CPF.isValid()
- `email`: passes RFC 5322 regex
- `phone`: matches `/^\+55\d{10,11}$/`
- `evp`: valid UUID v4 (system-generated)

---

### «ValueObject» PixLimit

| Attribute | Type | Description |
|-----------|------|-------------|
| `daytimeDailyLimitCents` | `number` | 500000 (R$5.000) |
| `nighttimePerTxLimitCents` | `number` | 100000 (R$1.000) |
| `enhancedAuthThresholdCents` | `number` | 200000 (R$2.000) |

**Methods:**

| Method | Signature |
|--------|-----------|
| `isNighttime` | `static isNighttime(date: Date): boolean` |
| `requiresEnhancedAuth` | `static requiresEnhancedAuth(amount: Money): boolean` |
| `validateAmount` | `static validateAmount(amount: Money, dailyUsedCents: number, date: Date): void` |

---

## Bounded Context: Cards & Payments (BC-04)

### «AggregateRoot» Card

**Table:** `cards`

| Attribute | Type | Constraints |
|-----------|------|-------------|
| `id` | `number` | PK, auto-increment |
| `userId` | `number` | NOT NULL, FK → users.id |
| `accountId` | `number` | NOT NULL, FK → accounts.id |
| `cardNumber` | `CardNumber` (VO) | NOT NULL, UNIQUE |
| `cvv` | `string` | NOT NULL, hashed with bcryptjs |
| `expiryDate` | `string` | NOT NULL, MM/YYYY |
| `creditLimit` | `Money` (VO) | NOT NULL [cents] |
| `availableLimit` | `Money` (VO) | NOT NULL [cents] |
| `status` | `CardStatus` (Enum) | NOT NULL, DEFAULT 'active' |
| `createdAt` | `Date` | NOT NULL |
| `updatedAt` | `Date` | NOT NULL |
| `deletedAt` | `Date?` | soft delete |

**Methods:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `issue` | `static issue(userId, accountId, creditLimit): Card` | Factory. Generates card number, CVV, expiry. |
| `block` | `block(): void` | `active → blocked` |
| `unblock` | `unblock(): void` | `blocked → active` |
| `cancel` | `cancel(): void` | `active/blocked → cancelled` (irreversible) |
| `registerPurchase` | `registerPurchase(merchant, amount, category?): CardPurchase` | Validates status + limit. Adds to open invoice. |
| `getCurrentInvoice` | `getCurrentInvoice(): Invoice` | Returns current open invoice or creates one. |
| `getMaskedNumber` | `getMaskedNumber(): string` | Returns `****-****-****-XXXX` |

**Relationships:**
- `Card` 1 → * `Invoice` (child entity)
- `Invoice` 1 → * `CardPurchase` (child entity)

**Domain Events Emitted:**
- `CardIssued`, `CardBlocked`, `CardUnblocked`, `PurchaseRegistered`, `InvoiceClosed`

---

### «Entity» Invoice

**Table:** `invoices`

| Attribute | Type | Constraints |
|-----------|------|-------------|
| `id` | `number` | PK |
| `cardId` | `number` | FK → cards.id |
| `month` | `number` | 1–12 |
| `year` | `number` | |
| `totalAmount` | `Money` (VO) | NOT NULL [cents] |
| `status` | `InvoiceStatus` (Enum) | NOT NULL |
| `dueDate` | `Date` | NOT NULL |
| `closedAt` | `Date?` | nullable |
| `paidAt` | `Date?` | nullable |
| `createdAt` | `Date` | NOT NULL |

**Methods:**

| Method | Signature |
|--------|-----------|
| `close` | `close(): void` — `open → closed` |
| `pay` | `pay(): void` — `closed → paid` |
| `addPurchase` | `addPurchase(purchase: CardPurchase): void` |
| `isOpen` | `isOpen(): boolean` |

---

### «Entity» CardPurchase

**Table:** `card_purchases`

| Attribute | Type | Constraints |
|-----------|------|-------------|
| `id` | `number` | PK |
| `invoiceId` | `number` | FK → invoices.id |
| `cardId` | `number` | FK → cards.id |
| `merchantName` | `string` | NOT NULL |
| `amount` | `Money` (VO) | NOT NULL [cents] |
| `category` | `TransactionCategory?` | nullable |
| `purchaseDate` | `Date` | NOT NULL |
| `description` | `string?` | nullable |
| `deletedAt` | `Date?` | soft delete |

---

### «Enum» CardStatus

| Value | Description |
|-------|-------------|
| `active` | Card operational for purchases |
| `blocked` | Temporarily blocked by user |
| `cancelled` | Permanently deactivated |

**Valid transitions:** `active ↔ blocked`, `active/blocked → cancelled` (irreversible)

---

### «Enum» InvoiceStatus

| Value | Description |
|-------|-------------|
| `open` | Current cycle, accepting new purchases |
| `closed` | Closed on day 25, total is final |
| `paid` | Invoice paid by the user |

---

### «ValueObject» CardNumber

| Attribute | Type | Description |
|-----------|------|-------------|
| `value` | `string` | 16 digits, Luhn-valid |

**Methods:**

| Method | Signature |
|--------|-----------|
| `generate` | `static generate(): CardNumber` |
| `mask` | `mask(): string` — `****-****-****-XXXX` |
| `lastFour` | `lastFour(): string` |

---

### «ValueObject» BoletoBarcode

| Attribute | Type | Description |
|-----------|------|-------------|
| `value` | `string` | 44–47 numeric digits |
| `amount` | `Money?` | Optional embedded amount |
| `dueDate` | `Date?` | Optional embedded due date |

**Methods:**

| Method | Signature |
|--------|-----------|
| `create` | `static create(barcode: string): BoletoBarcode` |
| `validate` | `validate(): boolean` — checksum validation |
| `parse` | `parse(): BoletoData` — extracts bank, agency, amount |

---

## Bounded Context: Intelligence (BC-05)

### «AggregateRoot» Notification

**Table:** `notifications`

| Attribute | Type | Constraints |
|-----------|------|-------------|
| `id` | `number` | PK |
| `userId` | `number` | NOT NULL, FK → users.id |
| `type` | `NotificationType` (Enum) | NOT NULL |
| `title` | `string` | NOT NULL |
| `message` | `string` | NOT NULL |
| `data` | `Record<string, unknown>?` | JSON metadata |
| `isRead` | `boolean` | NOT NULL, DEFAULT false |
| `createdAt` | `Date` | NOT NULL |
| `readAt` | `Date?` | nullable |

**Methods:**

| Method | Signature |
|--------|-----------|
| `create` | `static create(userId, type, title, message, data?): Notification` |
| `markAsRead` | `markAsRead(): void` |
| `isUnread` | `isUnread(): boolean` |

---

### «Enum» NotificationType

| Value | Description |
|-------|-------------|
| `pix_sent` | Pix transfer sent |
| `pix_received` | Pix transfer received |
| `card_purchase` | New card purchase |
| `invoice_closed` | Invoice closed with total |
| `boleto_paid` | Boleto payment confirmed |
| `security_alert` | Security-relevant event (e.g., password change) |
| `salary_cycle` | Salary cycle insight alert |
| `limit_warning` | Approaching limit alert |

---

### «ValueObject» SalaryCycle

| Attribute | Type | Description |
|-----------|------|-------------|
| `startDate` | `Date` | Cycle start (previous salary day) |
| `endDate` | `Date` | Cycle end (next salary day - 1) |
| `salaryDay` | `number` | Configured day (1–31) |

**Methods:**

| Method | Signature |
|--------|-----------|
| `current` | `static current(salaryDay: number): SalaryCycle` |
| `daysRemaining` | `daysRemaining(): number` |
| `percentElapsed` | `percentElapsed(): number` |
| `containsDate` | `containsDate(date: Date): boolean` |

---

### «ValueObject» CategoryRule

| Attribute | Type | Description |
|-----------|------|-------------|
| `keywords` | `string[]` | Case-insensitive match list |
| `category` | `TransactionCategory` | Target category |
| `priority` | `number` | Higher = checked first |

**Methods:**

| Method | Signature |
|--------|-----------|
| `matches` | `matches(description: string): boolean` |
| `classify` | `static classify(description: string, rules: CategoryRule[]): TransactionCategory` |

---

## Service Layer (Cross-Cutting)

### «Service» AuthService

| Method | Signature |
|--------|-----------|
| `register` | `register(name, email, cpf, password): { user: User, token: JwtToken }` |
| `login` | `login(email, password): { user: User, token: JwtToken }` |
| `validateToken` | `validateToken(token: string): JwtPayload` |
| `changePassword` | `changePassword(userId, currentPassword, newPassword): void` |

---

### «Service» AccountService

| Method | Signature |
|--------|-----------|
| `getBalance` | `getBalance(userId: number): AccountBalance` |
| `debit` | `debit(accountId, amount, type, desc, idempotencyKey?): Transaction` |
| `credit` | `credit(accountId, amount, type, desc, idempotencyKey?): Transaction` |
| `getTransactions` | `getTransactions(userId, filters): Transaction[]` |
| `getSummary` | `getSummary(userId, startDate, endDate): AccountSummary` |

---

### «Service» PixService

| Method | Signature |
|--------|-----------|
| `getKeys` | `getKeys(userId): PixKey[]` |
| `registerKey` | `registerKey(userId, keyType, keyValue): PixKey` |
| `deleteKey` | `deleteKey(userId, pixKeyId): void` |
| `transfer` | `transfer(userId, toKeyValue, amount, description, idempotencyKey): Transaction` |
| `getQRCode` | `getQRCode(userId, pixKeyId, amount?): string` |

---

### «Service» CardService

| Method | Signature |
|--------|-----------|
| `getCard` | `getCard(userId): Card` |
| `issueCard` | `issueCard(userId): Card` |
| `blockCard` | `blockCard(userId, cardId): void` |
| `unblockCard` | `unblockCard(userId, cardId): void` |
| `getCurrentInvoice` | `getCurrentInvoice(userId, cardId): Invoice` |

---

### «Service» PaymentService

| Method | Signature |
|--------|-----------|
| `payBoleto` | `payBoleto(userId, barcode, idempotencyKey): Transaction` |

---

## Repository Interfaces

### «Repository» UserRepository

```typescript
interface UserRepository {
  findById(id: number): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByCPF(cpf: string): Promise<User | null>;
  save(user: User): Promise<void>;
  update(user: User): Promise<void>;
}
```

### «Repository» AccountRepository

```typescript
interface AccountRepository {
  findById(id: number): Promise<Account | null>;
  findByUserId(userId: number): Promise<Account | null>;
  save(account: Account): Promise<void>;
  updateBalance(accountId: number, balance: number, db?: Database): Promise<void>;
}
```

### «Repository» TransactionRepository

```typescript
interface TransactionRepository {
  findByAccountId(accountId: number, filters: TransactionFilters): Promise<Transaction[]>;
  findByIdempotencyKey(key: string): Promise<Transaction | null>;
  save(transaction: Transaction, db?: Database): Promise<Transaction>;
  getSummary(accountId: number, start: Date, end: Date): Promise<AccountSummary>;
}
```

### «Repository» PixKeyRepository

```typescript
interface PixKeyRepository {
  findByUserId(userId: number): Promise<PixKey[]>;
  findByKeyValue(keyValue: string): Promise<PixKey | null>;
  countActiveByUserId(userId: number): Promise<number>;
  save(key: PixKey): Promise<PixKey>;
  softDelete(pixKeyId: number, userId: number): Promise<void>;
}
```

### «Repository» CardRepository

```typescript
interface CardRepository {
  findByUserId(userId: number): Promise<Card | null>;
  save(card: Card): Promise<Card>;
  update(card: Card): Promise<void>;
  getCurrentInvoice(cardId: number): Promise<Invoice | null>;
  saveInvoice(invoice: Invoice): Promise<Invoice>;
}
```

### «Repository» NotificationRepository

```typescript
interface NotificationRepository {
  findByUserId(userId: number, unreadOnly?: boolean): Promise<Notification[]>;
  save(notification: Notification): Promise<void>;
  markAsRead(notificationId: number, userId: number): Promise<void>;
}
```

---

## Error Types

### «ValueObject» DomainError

| Subclass | HTTP Status | Description |
|----------|-------------|-------------|
| `InsufficientBalanceError` | 422 | Saldo insuficiente (RN-04) |
| `PixKeyLimitExceededError` | 422 | Máximo 5 chaves atingido (RN-05) |
| `PixDailyLimitExceededError` | 422 | Limite diário R$5.000 excedido (RN-01) |
| `PixNightlyLimitExceededError` | 422 | Limite noturno R$1.000 excedido (RN-02) |
| `EnhancedAuthRequiredError` | 403 | Autenticação reforçada necessária (RN-03) |
| `RateLimitExceededError` | 429 | Rate limit 10 Pix/hora atingido (RN-10) |
| `IdempotencyConflictError` | 409 | Chave de idempotência duplicada (RN-08) |
| `CardBlockedError` | 422 | Cartão bloqueado |
| `InvoiceAlreadyClosedError` | 422 | Fatura já fechada |
| `EntityNotFoundError` | 404 | Entidade não encontrada |
| `InvalidCredentialsError` | 401 | Credenciais inválidas |
| `DuplicateEmailError` | 409 | E-mail já cadastrado |
| `DuplicateCPFError` | 409 | CPF já cadastrado |
| `InvalidCPFError` | 400 | CPF com dígitos verificadores inválidos |

---

*Generated by the Software Architect agent — ECP Digital Bank — Phase 03 Product Delivery*
