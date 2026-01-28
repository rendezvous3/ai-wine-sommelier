```graphql
    query MenuQuery(
    $retailerId: ID!
    ) {
    menu(
        retailerId: $retailerId
    ) {
        products {
        ...productFragment
        }
    }
    }
```

```graphql
    fragment brandFragment on Brand {
    description
    id
    imageUrl
    name
    }

    query BrandsQuery(
    $retailerId: ID!
    ) {
    menu( 
        retailerId: $retailerId
    ) {
        brands {
        ...brandFragment
        }
    }
    }
```
Filter Menu By Category
```graphql
    query MenuByCategory(
    $retailerId: ID!
    ) {
    menu(
        retailerId: $retailerId
        filter: { category: VAPORIZERS }
    ) {
        products {
        ...productFragment
        }
    }
    }
```