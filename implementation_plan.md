# Optimize MongoDB Queries

This plan details the necessary steps to significantly improve database response times across the DiamondPizza platform by introducing proper indexing and utilizing Mongoose's `.lean()` method for read-only operations.

## Background Context
Currently, the application executes many read-heavy queries without utilizing Mongoose's `.lean()` method, meaning each fetched document is instantiated as a heavy Mongoose Document object, significantly slowing down read operations and increasing memory consumption. Furthermore, several models lack compound indexes on frequently queried fields (e.g., `restaurantId` combined with `status` or `createdAt`), resulting in slower collection scans.

## User Review Required
> [!IMPORTANT]
> - Applying `.lean()` means the returned objects are plain JSON objects and will no longer have Mongoose methods attached (like `.save()`). I have carefully identified only the `GET` (read-only) endpoints for this change to prevent breaking any functionality.
> - Indexes will consume slightly more disk space but drastically improve query speed.

## Proposed Changes

### Models (Database Indexing)

Adding compound and single-field indexes to frequently filtered fields to ensure queries use index scans instead of collection scans.

#### [MODIFY] [Offer.ts](file:///E:/FreeLance%20Projects/DiamondPizza-Software/server/src/models/Offer.ts)
- Add index for `{ restaurantId: 1, isActive: 1 }`
- Add index for `{ code: 1, isActive: 1 }`

#### [MODIFY] [Order.ts](file:///E:/FreeLance%20Projects/DiamondPizza-Software/server/src/models/Order.ts)
- Add compound index for `{ restaurantId: 1, createdAt: -1 }` (Used heavily in Admin dashboard)
- Add compound index for `{ restaurantId: 1, orderStatus: 1 }`
- Add compound index for `{ userId: 1, createdAt: -1 }` (Used in user orders history)

#### [MODIFY] [Category.ts](file:///E:/FreeLance%20Projects/DiamondPizza-Software/server/src/models/Category.ts)
- Add index for `{ restaurantId: 1, isActive: 1 }`

---

### Controllers (Query Optimization using `.lean()`)

Using `.lean()` on queries where documents are strictly read and sent as a response. This reduces query execution time by skipping Mongoose Document hydration.

#### [MODIFY] [adminController.ts](file:///E:/FreeLance%20Projects/DiamondPizza-Software/server/src/controllers/adminController.ts)
- `getOrders`: Add `.lean()` to `Order.find(...)`
- `getMenuItems`: Add `.lean()` to `MenuItem.find(...)`
- `getUsers`: Add `.lean()` to `User.find(...)`
- `getOffers`: Add `.lean()` to `Offer.find(...)`
- `getCategories`: Add `.lean()` to `Category.find(...)`

#### [MODIFY] [menuController.ts](file:///E:/FreeLance%20Projects/DiamondPizza-Software/server/src/controllers/menuController.ts)
- `getMenu`: Add `.lean()` to `MenuItem.find(...)`
- `getOffers`: Add `.lean()` to `Offer.find(...)`
- `getCategories`: Add `.lean()` to `Category.find(...)`

#### [MODIFY] [userController.ts](file:///E:/FreeLance%20Projects/DiamondPizza-Software/server/src/controllers/userController.ts)
- `getUserProfile`: Add `.lean()` to `User.findById(...)`
- `getUserOrders`: Add `.lean()` to `Order.find(...)`

#### [MODIFY] [cartController.ts](file:///E:/FreeLance%20Projects/DiamondPizza-Software/server/src/controllers/cartController.ts)
- `validateOffer`: Add `.lean()` to `Offer.findOne(...)`
- Read queries for `MenuItem.find(...)` where items are only used for reference and not modified.

## Verification Plan
### Automated Tests
- Since this is primarily a performance update, no new automated tests are required. However, the existing endpoints will be tested manually to ensure there are no regressions.
### Manual Verification
- Start the server using `npm run dev`.
- Make API requests to the modified `GET` endpoints to ensure responses remain consistent with no missing data.
- Verify through MongoDB query performance logs (or Compass) that indexes are being utilized for admin dashboard queries.
