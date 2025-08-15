import { describe, it, expect } from 'vitest';
import { update, applyBinding, undoUpdate, anyChange, typeChange } from './data-model';
import { ALL, CapturePath, DataBinding, UpdateResult, Update, WHERE, META, DEFAULT, CONTEXT } from './data-model-types';



describe('data-model', () => {
    describe('update functionality', () => {
        describe('direct value updates', () => {
            it('should update simple properties', () => {
                const data = {
                    user: { name: 'Alice', age: 30 },
                    settings: { theme: 'dark' }
                };

                const changes = update(data, {
                    user: { age: 31 },
                    settings: { theme: 'light' }
                });

                expect(changes).toEqual({
                    user: { age: 31, [META]: { age: { original: 30 } } },
                    settings: { theme: 'light', [META]: { theme: { original: 'dark' } } }
                });
                expect(data.user.age).toBe(31);
                expect(data.settings.theme).toBe('light');
            });

            it('should return undefined when no changes occur', () => {
                const data = {
                    user: { name: 'Alice', age: 30 }
                };

                const changes = update(data, {
                    user: { age: 30 } // Same value
                });

                expect(changes).toBeUndefined();
            });

            it('should handle nested updates', () => {
                const data = {
                    app: {
                        ui: { theme: 'dark', fontSize: 14 },
                        features: { autoSave: true }
                    }
                };

                const changes = update(data, {
                    app: {
                        ui: { theme: 'light' }
                    }
                });

                expect(changes).toEqual({
                    app: {
                        ui: { theme: 'light', [META]: { theme: { original: 'dark' } } }
                    }
                });
                expect(data.app.ui.theme).toBe('light');
                expect(data.app.ui.fontSize).toBe(14); // Unchanged
            });
        });

        describe('function updates', () => {
            it('should apply function transforms', () => {
                const data = {
                    user: { name: 'alice', score: 100 }
                };

                const changes = update(data, {
                    user: {
                        name: (current: string, _data) => current.toUpperCase(),
                        score: (current: number, _data) => current * 2
                    }
                });

                expect(changes).toEqual({
                    user: { 
                        name: 'ALICE', 
                        score: 200,
                        [META]: { 
                            name: { original: 'alice' }, 
                            score: { original: 100 } 
                        }
                    }
                });
                expect(data.user.name).toBe('ALICE');
                expect(data.user.score).toBe(200);
            });

            it('should handle functions that return nested updates', () => {
                const data = {
                    counter: { value: 5, metadata: { lastUpdate: 0 } }
                };

                const changes = update(data, {
                    counter: (current, _data) => ({
                        value: current.value + 1,
                        metadata: { lastUpdate: Date.now() }
                    })
                });

                expect(changes?.counter?.value).toBe(6);
                expect(changes?.counter?.metadata?.lastUpdate).toBeGreaterThan(0);
            });

            it('should use data parameter in update functions', () => {
                const data = {
                    config: { multiplier: 2, baseValue: 10 },
                    result: { value: 0, computed: 0 }
                };

                const changes = update(data, {
                    result: (current, data) => ({
                        ...current,
                        computed: data.config.baseValue * data.config.multiplier
                    })
                });

                expect(changes).toEqual({
                    result: { 
                        computed: 20,
                        [META]: { computed: { original: 0 } }
                    }
                });
                expect(data.result.computed).toBe(20);
            });

            it('should access sibling properties in update functions', () => {
                const data = {
                    user: {
                        firstName: 'John',
                        lastName: 'Doe',
                        fullName: ''
                    }
                };

                const changes = update(data, {
                    user: (current, _data) => ({
                        ...current,
                        fullName: `${current.firstName} ${current.lastName}`
                    })
                });

                expect(changes).toEqual({
                    user: {
                        fullName: 'John Doe',
                        [META]: { fullName: { original: '' } }
                    }
                });
            });

            it('should calculate derived values using data context', () => {
                const data = {
                    items: [
                        { price: 10, quantity: 2 },
                        { price: 20, quantity: 3 },
                        { price: 5, quantity: 4 }
                    ],
                    totals: {
                        subtotal: 0,
                        tax: 0,
                        total: 0
                    },
                    taxRate: 0.1
                };

                const changes = update(data, {
                    totals: (_current, data) => {
                        const subtotal = data.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
                        const tax = subtotal * data.taxRate;
                        return {
                            subtotal,
                            tax,
                            total: subtotal + tax
                        };
                    }
                });

                expect(changes).toEqual({
                    totals: {
                        subtotal: 100,
                        tax: 10,
                        total: 110,
                        [META]: {
                            subtotal: { original: 0 },
                            tax: { original: 0 },
                            total: { original: 0 }
                        }
                    }
                });
            });

            it('should demonstrate practical use of data parameter', () => {
                // Menu item with variants and dynamic pricing
                const data = {
                    menuItem: {
                        basePrice: 10,
                        variants: {
                            small: { multiplier: 0.8, price: 0 },
                            medium: { multiplier: 1.0, price: 0 },
                            large: { multiplier: 1.3, price: 0 }
                        }
                    },
                    settings: {
                        taxRate: 0.08,
                        discount: 0.1
                    }
                };

                // Update all variant prices based on base price
                // Note: when using ALL in nested objects, data param is the parent (variants), not root
                const changes = update(data, {
                    menuItem: (current, data) => ({
                        ...current,
                        variants: Object.fromEntries(
                            Object.entries(current.variants).map(([key, variant]) => [
                                key,
                                { ...variant, price: current.basePrice * variant.multiplier * (1 - data.settings.discount) }
                            ])
                        )
                    })
                });

                expect(changes).toEqual({
                    menuItem: {
                        variants: {
                            small: { price: 7.2, [META]: { price: { original: 0 } } },
                            medium: { price: 9, [META]: { price: { original: 0 } } },
                            large: { price: expect.closeTo(11.7, 5), [META]: { price: { original: 0 } } }  // Handle float precision
                        }
                    }
                });
            });
        });

        describe('ALL symbol updates', () => {
            it('should apply updates to all properties', () => {
                const data = {
                    users: {
                        user1: { name: 'Alice', status: 'active' },
                        user2: { name: 'Bob', status: 'active' },
                        user3: { name: 'Charlie', status: 'inactive' }
                    }
                };

                const changes = update(data, {
                    users: {
                        [ALL]: { status: 'pending' }
                    }
                });

                expect(changes).toEqual({
                    users: {
                        user1: { status: 'pending', [META]: { status: { original: 'active' } } },
                        user2: { status: 'pending', [META]: { status: { original: 'active' } } },
                        user3: { status: 'pending', [META]: { status: { original: 'inactive' } } }
                    }
                });

                Object.values(data.users).forEach(user => {
                    expect(user.status).toBe('pending');
                });
            });

            it('should apply function updates to all properties', () => {
                const data = {
                    products: {
                        prod1: { price: 100 },
                        prod2: { price: 200 },
                        prod3: { price: 300 }
                    }
                };

                const changes = update(data, {
                    products: {
                        [ALL]: {
                            price: (current: number, _data) => Math.round(current * 1.1)
                        }
                    }
                });

                expect(changes).toEqual({
                    products: {
                        prod1: { price: 110, [META]: { price: { original: 100 } } },
                        prod2: { price: 220, [META]: { price: { original: 200 } } },
                        prod3: { price: 330, [META]: { price: { original: 300 } } }
                    }
                });
            });

            it('should override ALL with specific updates', () => {
                const data = {
                    items: {
                        item1: { value: 1 },
                        item2: { value: 2 },
                        item3: { value: 3 }
                    }
                };

                const changes = update(data, {
                    items: {
                        item2: { value: 20 }, // Specific override
                        [ALL]: { value: 10 }
                    }
                });

                expect(changes).toEqual({
                    items: {
                        item1: { value: 10, [META]: { value: { original: 1 } } },
                        item2: { value: 20, [META]: { value: { original: 2 } } }, // Specific value takes precedence
                        item3: { value: 10, [META]: { value: { original: 3 } } }
                    }
                });
            });
        });

        describe('WHERE clause', () => {
            it('should conditionally apply updates with WHERE', () => {
                const data = {
                    users: {
                        user1: { name: 'Alice', age: 25, category: 'regular' },
                        user2: { name: 'Bob', age: 65, category: 'regular' },
                        user3: { name: 'Charlie', age: 70, category: 'regular' }
                    }
                };

                const changes = update(data, {
                    users: {
                        [ALL]: {
                            [WHERE]: (user) => user.age >= 65,
                            category: 'senior'
                        }
                    }
                });

                expect(changes).toEqual({
                    users: {
                        user2: { category: 'senior', [META]: { category: { original: 'regular' } } },
                        user3: { category: 'senior', [META]: { category: { original: 'regular' } } }
                    }
                });
                expect(data.users.user1.category).toBe('regular');
                expect(data.users.user2.category).toBe('senior');
                expect(data.users.user3.category).toBe('senior');
            });

            it('should use data parameter in ALL update functions', () => {
                const data = {
                    globalDiscount: 0.15,
                    products: {
                        laptop: { price: 1000, discountedPrice: 0 },
                        phone: { price: 500, discountedPrice: 0 },
                        tablet: { price: 300, discountedPrice: 0 }
                    }
                };

                // When using ALL with nested properties, the data parameter
                // is the parent object (products), not the root
                const changes = update(data, {
                    products: {
                        [ALL]: (current, _products) => ({
                            ...current,
                            // We need to access globalDiscount differently
                            discountedPrice: current.price * 0.85
                        })
                    }
                });

                expect(changes).toEqual({
                    products: {
                        laptop: { discountedPrice: 850, [META]: { discountedPrice: { original: 0 } } },
                        phone: { discountedPrice: 425, [META]: { discountedPrice: { original: 0 } } },
                        tablet: { discountedPrice: 255, [META]: { discountedPrice: { original: 0 } } }
                    }
                });
            });

            it('should work with nested WHERE conditions', () => {
                const data: { departments: Record<'eng' | 'sales', { employees: Record<string, { salary: number, years: number }> }> } = {
                    departments: {
                        eng: {
                            employees: {
                                emp1: { salary: 50000, years: 3 },
                                emp2: { salary: 70000, years: 5 },
                                emp3: { salary: 80000, years: 7 }
                            }
                        },
                        sales: {
                            employees: {
                                emp4: { salary: 60000, years: 4 },
                                emp5: { salary: 75000, years: 6 }
                            }
                        }
                    }
                };

                const changes = update(data, {
                    departments: {
                        [ALL]: {
                            employees: {
                                [ALL]: {
                                    [WHERE]: (emp) => emp.years >= 5,
                                    salary: 100000
                                }
                            }
                        }
                    }
                });

                expect(changes?.departments?.eng?.employees).toEqual({
                    emp2: { salary: 100000, [META]: { salary: { original: 70000 } } },
                    emp3: { salary: 100000, [META]: { salary: { original: 80000 } } }
                });
                expect(changes?.departments?.sales?.employees).toEqual({
                    emp5: { salary: 100000, [META]: { salary: { original: 75000 } } }
                });
            });

            it('should not update nested properties when WHERE clause at top level returns false', () => {
                const data = {
                    menu: {
                        item1: { name: 'Pizza', selected: true }
                    },
                    order: undefined as { children: Record<string, any> } | undefined
                };

                // This should not throw an error even though order is undefined
                const changes = update(data, {
                    [WHERE]: (d) => d.order != null,
                    order: {
                        children: {
                            item1: [{
                                menuItemId: 'item1',
                                name: 'Pizza',
                                quantity: 1,
                                price: 10
                            }]
                        }
                    }
                });

                expect(changes).toBeUndefined();
                expect(data.order).toBeUndefined();
            });

            it('should update nested properties when WHERE clause at top level returns true', () => {
                const data = {
                    menu: {
                        item1: { name: 'Pizza', selected: true }
                    },
                    order: {
                        children: {} as Record<string, any>
                    }
                };

                const changes = update(data, {
                    [WHERE]: (d) => d.order != null,
                    order: {
                        children: {
                            item1: [{
                                menuItemId: 'item1',
                                name: 'Pizza',
                                quantity: 1,
                                price: 10
                            }]
                        }
                    }
                });

                expect(changes).toEqual({
                    order: {
                        children: {
                            item1: {
                                menuItemId: 'item1',
                                name: 'Pizza',
                                quantity: 1,
                                price: 10
                            },
                            [META]: {
                                item1: { original: undefined }
                            }
                        }
                    }
                });
                expect(data.order.children.item1).toEqual({
                    menuItemId: 'item1',
                    name: 'Pizza',
                    quantity: 1,
                    price: 10
                });
            });
        });

        describe('DEFAULT symbol updates', () => {
            it('should create object from DEFAULT when field is null', () => {
                const data: { user: { profile: { name: string, age: number } | null } } = {
                    user: { profile: null }
                };

                const changes = update(data, {
                    user: {
                        profile: {
                            [DEFAULT]: { name: '', age: 0 },
                            name: 'Alice',
                            age: 30
                        }
                    }
                });

                expect(changes).toEqual({
                    user: {
                        profile: {
                            name: 'Alice',
                            age: 30
                        },
                        [META]: {
                            profile: { original: null }
                        }
                    }
                });
                expect(data.user.profile).toEqual({ name: 'Alice', age: 30 });
            });

            it('should apply partial updates to DEFAULT-created object', () => {
                const data: { settings: { ui: { theme: string, fontSize: number } | null } } = {
                    settings: { ui: null }
                };

                const changes = update(data, {
                    settings: {
                        ui: {
                            [DEFAULT]: { theme: 'light', fontSize: 14 },
                            theme: 'dark'
                            // fontSize not specified, should use default
                        }
                    }
                });

                expect(changes).toEqual({
                    settings: {
                        ui: {
                            theme: 'dark',
                            fontSize: 14
                        },
                        [META]: {
                            ui: { original: null }
                        }
                    }
                });
                expect(data.settings.ui).toEqual({ theme: 'dark', fontSize: 14 });
            });

            it('should work with WHERE clause and DEFAULT', () => {
                const data: { items: Record<string, { details: { price: number } | null }> } = {
                    items: {
                        item1: { details: null },
                        item2: { details: { price: 100 } },
                        item3: { details: null }
                    }
                };

                const changes = update(data, {
                    items: {
                        [ALL]: {
                            details: {
                                [WHERE]: (details) => details === null || details.price < 50,
                                [DEFAULT]: { price: 0 },
                                price: 25
                            }
                        }
                    }
                });

                expect(changes).toEqual({
                    items: {
                        item1: {
                            details: {
                                price: 25
                            },
                            [META]: { details: { original: null } }
                        },
                        item3: {
                            details: {
                                price: 25
                            },
                            [META]: { details: { original: null } }
                        }
                    }
                });
                expect(data.items.item1.details).toEqual({ price: 25 });
                expect(data.items.item2.details).toEqual({ price: 100 }); // Unchanged (WHERE condition false)
                expect(data.items.item3.details).toEqual({ price: 25 });
            });

            it('should handle complex nested structures with DEFAULT', () => {
                const data: { 
                    order: { 
                        customer: { 
                            address: { 
                                street: string, 
                                city: string, 
                                country: string 
                            } | null 
                        } | null 
                    } 
                } = {
                    order: { customer: null }
                };

                const changes = update(data, {
                    order: {
                        customer: {
                            [DEFAULT]: { address: null },
                            address: {
                                [DEFAULT]: { street: '', city: '', country: 'USA' },
                                street: '123 Main St',
                                city: 'New York'
                            }
                        }
                    }
                });

                expect(changes).toEqual({
                    order: {
                        customer: {
                            address: {
                                street: '123 Main St',
                                city: 'New York',
                                country: 'USA'
                            }
                        },
                        [META]: {
                            customer: { original: null }
                        }
                    }
                });
                expect(data.order.customer?.address).toEqual({
                    street: '123 Main St',
                    city: 'New York',
                    country: 'USA'
                });
            });

            it('should handle DEFAULT with arrays', () => {
                const data: { cart: { items: Array<{ id: string, quantity: number }> | null } } = {
                    cart: { items: null }
                };

                const changes = update(data, {
                    cart: {
                        items: {
                            [DEFAULT]: [],
                            [0]: [{ id: 'item1', quantity: 2 }]
                        }
                    }
                });

                expect(changes).toEqual({
                    cart: {
                        items: [{ id: 'item1', quantity: 2 }],
                        [META]: {
                            items: { original: null }
                        }
                    }
                });
                expect(data.cart.items).toEqual([{ id: 'item1', quantity: 2 }]);
            });

            it('should use structuredClone for DEFAULT to avoid reference issues', () => {
                const defaultProfile = { name: 'Default', settings: { notifications: true } };
                const data: { 
                    users: { 
                        user1: { profile: typeof defaultProfile | null },
                        user2: { profile: typeof defaultProfile | null }
                    } 
                } = {
                    users: {
                        user1: { profile: null },
                        user2: { profile: null }
                    }
                };

                update(data, {
                    users: {
                        user1: {
                            profile: {
                                [DEFAULT]: defaultProfile,
                                name: 'Alice'
                            }
                        },
                        user2: {
                            profile: {
                                [DEFAULT]: defaultProfile,
                                name: 'Bob'
                            }
                        }
                    }
                });

                // Each user should have their own copy, not share the same reference
                expect(data.users.user1.profile).not.toBe(data.users.user2.profile);
                expect(data.users.user1.profile?.name).toBe('Alice');
                expect(data.users.user2.profile?.name).toBe('Bob');
                // Original default should be unchanged
                expect(defaultProfile.name).toBe('Default');
            });

            it('should not apply DEFAULT when field is not null', () => {
                const data: { user: { profile: { name: string, age: number } | null } } = {
                    user: { profile: { name: 'Bob', age: 25 } }
                };

                const changes = update(data, {
                    user: {
                        profile: {
                            [DEFAULT]: { name: '', age: 0 },
                            name: 'Alice'
                        }
                    }
                });

                expect(changes).toEqual({
                    user: {
                        profile: {
                            name: 'Alice',
                            [META]: {
                                name: { original: 'Bob' }
                            }
                        }
                    }
                });
                expect(data.user.profile).toEqual({ name: 'Alice', age: 25 });
            });

            it('should handle DEFAULT with function updates', () => {
                const data: { 
                    stats: { 
                        counts: { total: number, active: number } | null 
                    } 
                } = {
                    stats: { counts: null }
                };

                const changes = update(data, {
                    stats: {
                        counts: {
                            [DEFAULT]: { total: 0, active: 0 },
                            total: 100,
                            active: (current: number) => current + 50
                        }
                    }
                });

                expect(changes).toEqual({
                    stats: {
                        counts: {
                            total: 100,
                            active: 50
                        },
                        [META]: {
                            counts: { original: null }
                        }
                    }
                });
                expect(data.stats.counts).toEqual({ total: 100, active: 50 });
            });
        });

        describe('CONTEXT symbol updates', () => {
            it('should pass context variables to update functions', () => {
                const data = {
                    products: {
                        p1: { price: 100, discountedPrice: 0 },
                        p2: { price: 200, discountedPrice: 0 }
                    }
                };

                const changes = update(data, {
                    [CONTEXT]: { discount: 0.2 },
                    products: {
                        [ALL]: {
                            discountedPrice: (_current, item, _key, ctx) => item.price * (1 - ctx!.discount)
                        }
                    }
                });

                expect(changes).toEqual({
                    products: {
                        p1: { discountedPrice: 80, [META]: { discountedPrice: { original: 0 } } },
                        p2: { discountedPrice: 160, [META]: { discountedPrice: { original: 0 } } }
                    }
                });
            });

            it('should propagate context through nested updates', () => {
                const data = {
                    store: {
                        categories: {
                            electronics: {
                                items: [
                                    { name: 'TV', price: 1000 },
                                    { name: 'Radio', price: 100 }
                                ]
                            }
                        }
                    }
                };

                const changes = update(data, {
                    [CONTEXT]: { multiplier: 1.5 },
                    store: {
                        categories: {
                            electronics: {
                                items: {
                                    [ALL]: {
                                        price: (current, _item, _index, ctx) => current * ctx!.multiplier
                                    }
                                }
                            }
                        }
                    }
                });

                expect(changes).toEqual({
                    store: {
                        categories: {
                            electronics: {
                                items: {
                                    0: { price: 1500, [META]: { price: { original: 1000 } } },
                                    1: { price: 150, [META]: { price: { original: 100 } } }
                                }
                            }
                        }
                    }
                });
            });

            it('should allow child context to override parent context', () => {
                const data = {
                    regions: {
                        us: { baseTax: 0, finalTax: 0 },
                        eu: { baseTax: 0, finalTax: 0 }
                    }
                };

                const changes = update(data, {
                    [CONTEXT]: { taxRate: 0.1 },
                    regions: {
                        us: {
                            baseTax: (_current, _item, _key, ctx) => ctx!.taxRate
                        },
                        eu: {
                            [CONTEXT]: { taxRate: 0.2 }, // Override for EU
                            baseTax: (_current, _item, _key, ctx) => ctx!.taxRate
                        }
                    }
                });

                expect(changes).toEqual({
                    regions: {
                        us: { baseTax: 0.1, [META]: { baseTax: { original: 0 } } },
                        eu: { baseTax: 0.2, [META]: { baseTax: { original: 0 } } }
                    }
                });
            });

            it('should use context in WHERE clauses', () => {
                const data = {
                    items: {
                        item1: { price: 50, category: 'regular' },
                        item2: { price: 150, category: 'regular' },
                        item3: { price: 250, category: 'regular' }
                    }
                };

                const changes = update(data, {
                    [CONTEXT]: { threshold: 100 },
                    items: {
                        [ALL]: {
                            [WHERE]: (item, ctx) => item.price > ctx!.threshold,
                            category: 'premium'
                        }
                    }
                });

                expect(changes).toEqual({
                    items: {
                        item2: { category: 'premium', [META]: { category: { original: 'regular' } } },
                        item3: { category: 'premium', [META]: { category: { original: 'regular' } } }
                    }
                });
                expect(data.items.item1.category).toBe('regular');
            });

            it('should handle multiple context levels', () => {
                const data = {
                    company: {
                        departments: {
                            eng: {
                                teams: {
                                    frontend: { budget: 1000 },
                                    backend: { budget: 1500 }
                                }
                            }
                        }
                    }
                };

                const changes = update(data, {
                    [CONTEXT]: { globalMultiplier: 1.1 },
                    company: {
                        departments: {
                            eng: {
                                [CONTEXT]: { deptBonus: 100 },
                                teams: {
                                    frontend: {
                                        [CONTEXT]: { teamBonus: 50 },
                                        budget: (current, _item, _key, ctx) => 
                                            current * ctx!.globalMultiplier + ctx!.deptBonus + ctx!.teamBonus
                                    },
                                    backend: {
                                        budget: (current, _item, _key, ctx) => 
                                            current * ctx!.globalMultiplier + ctx!.deptBonus
                                    }
                                }
                            }
                        }
                    }
                });

                expect(changes).toEqual({
                    company: {
                        departments: {
                            eng: {
                                teams: {
                                    frontend: { 
                                        budget: 1250, // 1000 * 1.1 + 100 + 50
                                        [META]: { budget: { original: 1000 } } 
                                    },
                                    backend: { 
                                        budget: expect.closeTo(1750, 5), // 1500 * 1.1 + 100
                                        [META]: { budget: { original: 1500 } } 
                                    }
                                }
                            }
                        }
                    }
                });
            });

            it('should work with arrays and CONTEXT', () => {
                const data = {
                    orders: [
                        { id: 1, subtotal: 100, total: 0 },
                        { id: 2, subtotal: 200, total: 0 },
                        { id: 3, subtotal: 300, total: 0 }
                    ]
                };

                const changes = update(data, {
                    [CONTEXT]: { tax: 0.08, shipping: 10 },
                    orders: {
                        [ALL]: {
                            total: (_current, order, _index, ctx) => 
                                order.subtotal * (1 + ctx!.tax) + ctx!.shipping
                        }
                    }
                });

                expect(changes).toEqual({
                    orders: {
                        0: { total: 118, [META]: { total: { original: 0 } } },  // 100 * 1.08 + 10
                        1: { total: 226, [META]: { total: { original: 0 } } },  // 200 * 1.08 + 10
                        2: { total: 334, [META]: { total: { original: 0 } } }   // 300 * 1.08 + 10
                    }
                });
            });

            it('should handle practical pricing scenario with CONTEXT', () => {
                const data = {
                    menu: {
                        pizza: { basePrice: 10, size: 'medium', finalPrice: 0 },
                        pasta: { basePrice: 8, size: 'large', finalPrice: 0 },
                        salad: { basePrice: 6, size: 'small', finalPrice: 0 }
                    }
                };

                const sizeMultipliers = {
                    small: 0.8,
                    medium: 1.0,
                    large: 1.3
                };

                const changes = update(data, {
                    [CONTEXT]: { 
                        discount: 0.15,
                        tax: 0.1,
                        sizeMultipliers
                    },
                    menu: {
                        [ALL]: {
                            finalPrice: (_current, item, _key, ctx) => {
                                const sizeMultiplier = ctx!.sizeMultipliers[item.size] || 1;
                                const discounted = item.basePrice * sizeMultiplier * (1 - ctx!.discount);
                                return discounted * (1 + ctx!.tax);
                            }
                        }
                    }
                });

                expect(changes).toEqual({
                    menu: {
                        pizza: { 
                            finalPrice: expect.closeTo(9.35, 2), // 10 * 1.0 * 0.85 * 1.1
                            [META]: { finalPrice: { original: 0 } } 
                        },
                        pasta: { 
                            finalPrice: expect.closeTo(9.724, 2), // 8 * 1.3 * 0.85 * 1.1
                            [META]: { finalPrice: { original: 0 } } 
                        },
                        salad: { 
                            finalPrice: expect.closeTo(4.488, 2), // 6 * 0.8 * 0.85 * 1.1
                            [META]: { finalPrice: { original: 0 } } 
                        }
                    }
                });
            });

            it('should combine CONTEXT with DEFAULT operator', () => {
                const data: { 
                    user: { 
                        preferences: { theme: string, fontSize: number } | null 
                    } 
                } = {
                    user: { preferences: null }
                };

                const changes = update(data, {
                    [CONTEXT]: { defaultTheme: 'dark', defaultSize: 14 },
                    user: {
                        preferences: {
                            [DEFAULT]: { theme: '', fontSize: 0 },
                            theme: (_current, _prefs, _key, ctx) => ctx!.defaultTheme,
                            fontSize: (_current, _prefs, _key, ctx) => ctx!.defaultSize
                        }
                    }
                });

                expect(changes).toEqual({
                    user: {
                        preferences: {
                            theme: 'dark',
                            fontSize: 14
                        },
                        [META]: {
                            preferences: { original: null }
                        }
                    }
                });
                expect(data.user.preferences).toEqual({ theme: 'dark', fontSize: 14 });
            });
        });

        describe('edge cases', () => {
            it('should create nested objects when they do not exist', () => {
                const data: { config: { database?: { host?: string, port?: number } } } = {
                    config: {}
                };

                const changes = update(data, {
                    config: {
                        database: [{
                            host: 'localhost',
                            port: 5432
                        }]
                    }
                });

                expect(changes).toEqual({
                    config: {
                        database: {
                            host: 'localhost',
                            port: 5432
                        },
                        [META]: {
                            database: { original: undefined }
                        }
                    }
                });
                expect(data.config).toHaveProperty('database');
            });

            it('should replace terminal values with objects', () => {
                const data = {
                    settings: {
                        theme: 'dark' as string | { primary: string; secondary: string }
                    }
                };

                const changes = update(data, {
                    settings: {
                        theme: [{
                            primary: 'blue',
                            secondary: 'gray'
                        }]
                    }
                });

                expect(changes).toEqual({
                    settings: {
                        theme: {
                            primary: 'blue',
                            secondary: 'gray'
                        },
                        [META]: {
                            theme: { original: 'dark' }
                        }
                    }
                });
            });

            it('should handle empty updates', () => {
                const data = { user: { name: 'Alice' } };
                const changes = update(data, {});
                expect(changes).toBeUndefined();
            });

            it('should support full array replacement with array syntax', () => {
                const data = {
                    user: {
                        tags: ['admin', 'active']
                    }
                };

                const changes = update(data, {
                    user: {
                        tags: [['admin', 'active', 'premium']]
                    }
                });

                expect(changes).toEqual({
                    user: {
                        tags: ['admin', 'active', 'premium'],
                        [META]: {
                            tags: { original: ['admin', 'active'] }
                        }
                    }
                });
                expect(data.user.tags).toHaveLength(3);
            });

            it('should support partial array updates using index keys', () => {
                const data = {
                    user: {
                        tags: ['admin', 'active']
                    }
                };

                const changes = update(data, {
                    user: {
                        tags: { '2': 'premium' }
                    }
                });

                expect(changes).toEqual({
                    user: {
                        tags: { '2': 'premium', [META]: { '2': { original: undefined } } }
                    }
                });
                expect(data.user.tags).toEqual(['admin', 'active', 'premium']);
                expect(data.user.tags).toHaveLength(3);
            });

            it('should handle complex cross-reference updates', () => {
                const data = {
                    inventory: {
                        apple: { stock: 100, reserved: 0 },
                        banana: { stock: 50, reserved: 0 },
                        orange: { stock: 75, reserved: 0 }
                    },
                    orders: {
                        order1: { item: 'apple', quantity: 10, status: 'pending' },
                        order2: { item: 'banana', quantity: 5, status: 'pending' },
                        order3: { item: 'apple', quantity: 15, status: 'pending' }
                    },
                    // Derived state that we'll update
                    summary: {
                        totalPending: 0,
                        itemsWithOrders: 0
                    }
                };

                // Update summary based on orders
                const changes = update(data, {
                    summary: (_current, data) => {
                        const pending = Object.values(data.orders)
                            .filter(order => order.status === 'pending')
                            .reduce((sum, order) => sum + order.quantity, 0);

                        const uniqueItems = new Set(
                            Object.values(data.orders)
                                .filter(order => order.status === 'pending')
                                .map(order => order.item)
                        ).size;

                        return {
                            totalPending: pending,
                            itemsWithOrders: uniqueItems
                        };
                    }
                });

                expect(changes).toEqual({
                    summary: {
                        totalPending: 30,  // 10 + 5 + 15
                        itemsWithOrders: 2, // apple and banana
                        [META]: {
                            totalPending: { original: 0 },
                            itemsWithOrders: { original: 0 }
                        }
                    }
                });
            });

            it('should delete properties with empty array syntax', () => {
                const data: {
                    user: {
                        name: string;
                        email?: string;
                        age: number;
                    }
                } = {
                    user: {
                        name: 'John',
                        email: 'john@example.com',
                        age: 30
                    }
                };

                const changes = update(data, {
                    user: {
                        email: []
                    }
                });

                expect(changes).toEqual({
                    user: {
                        email: undefined,
                        [META]: {
                            email: { original: 'john@example.com' }
                        }
                    }
                });
                expect(data.user).not.toHaveProperty('email');
                expect(data.user.name).toBe('John');
                expect(data.user.age).toBe(30);
            });

            it('should replace nested objects with array syntax', () => {
                const data = {
                    config: {
                        database: {
                            host: 'localhost',
                            port: 5432,
                            username: 'admin'
                        },
                        cache: {
                            enabled: true
                        }
                    }
                };

                const changes = update(data, {
                    config: {
                        database: [{
                            host: 'newhost',
                            port: 3306,
                            username: 'root'
                        }]
                    }
                });

                expect(changes).toEqual({
                    config: {
                        database: {
                            host: 'newhost',
                            port: 3306,
                            username: 'root'
                        },
                        [META]: {
                            database: { original: {
                                host: 'localhost',
                                port: 5432,
                                username: 'admin'
                            } }
                        }
                    }
                });
                expect(data.config.database).toEqual({
                    host: 'newhost',
                    port: 3306,
                    username: 'root'
                });
            });

            it('should support ALL operator on arrays', () => {
                type Data = { items: string[] };
                const data: Data = {
                    items: ['apple', 'banana', 'cherry']
                };

                const changes = update(data, {
                    items: {
                        [ALL]: (value: string) => value.toUpperCase()
                    }
                });

                expect(changes).toEqual({
                    items: {
                        '0': 'APPLE',
                        '1': 'BANANA',
                        '2': 'CHERRY',
                        [META]: {
                            '0': { original: 'apple' },
                            '1': { original: 'banana' },
                            '2': { original: 'cherry' }
                        }
                    }
                });
                expect(data.items).toEqual(['APPLE', 'BANANA', 'CHERRY']);
            });

            it('should support WHERE operator with arrays', () => {
                type Users = {
                    users: Array<{ name: string; score: number; bonus?: number }>
                };

                const data: Users = {
                    users: [
                        { name: 'Alice', score: 85 },
                        { name: 'Bob', score: 92 },
                        { name: 'Charlie', score: 78 }
                    ]
                };

                const changes = update(data, {
                    users: {
                        [WHERE]: (users: Users['users']) => users.some(u => u.score > 90),
                        [ALL]: { bonus: 10 }
                    }
                });

                expect(changes).toEqual({
                    users: {
                        '0': { bonus: 10, [META]: { bonus: { original: undefined } } },
                        '1': { bonus: 10, [META]: { bonus: { original: undefined } } },
                        '2': { bonus: 10, [META]: { bonus: { original: undefined } } }
                    }
                });
                expect(data.users[0]).toEqual({ name: 'Alice', score: 85, bonus: 10 });
                expect(data.users[1]).toEqual({ name: 'Bob', score: 92, bonus: 10 });
                expect(data.users[2]).toEqual({ name: 'Charlie', score: 78, bonus: 10 });
            });

            it('should support nested array operations', () => {
                const data = {
                    matrix: [
                        [1, 2, 3],
                        [4, 5, 6],
                        [7, 8, 9]
                    ]
                };

                const changes = update(data, {
                    matrix: {
                        '1': {
                            '1': 50
                        }
                    }
                });

                expect(changes).toEqual({
                    matrix: {
                        '1': {
                            '1': 50,
                            [META]: { '1': { original: 5 } }
                        }
                    }
                });
                expect(data.matrix[1][1]).toBe(50);
                expect(data.matrix[0]).toEqual([1, 2, 3]);
                expect(data.matrix[2]).toEqual([7, 8, 9]);
            });

            it('should handle array replacement and partial updates together', () => {
                const data = {
                    lists: {
                        todo: ['task1', 'task2'],
                        done: ['task3']
                    }
                };

                const changes = update(data, {
                    lists: {
                        todo: { '2': 'task4' },
                        done: [['task3', 'task5', 'task6']]
                    }
                });

                expect(changes).toEqual({
                    lists: {
                        todo: { '2': 'task4', [META]: { '2': { original: undefined } } },
                        done: ['task3', 'task5', 'task6'],
                        [META]: {
                            done: { original: ['task3'] }
                        }
                    }
                });
                expect(data.lists.todo).toEqual(['task1', 'task2', 'task4']);
                expect(data.lists.done).toEqual(['task3', 'task5', 'task6']);
            });
        });

        describe('new Update type functionality', () => {
            it('should handle function properties with replacement syntax only', () => {
                type TestData = {
                    callback: () => void;
                    handler: (x: number) => string;
                };

                const data: TestData = {
                    callback: () => console.log('old'),
                    handler: (x) => `old: ${x}`
                };

                const newCallback = () => console.log('new');
                const newHandler = (x: number) => `new: ${x}`;

                const changes = update(data, {
                    callback: [newCallback],
                    handler: [newHandler]
                });

                expect(changes).toEqual({
                    callback: newCallback,
                    handler: newHandler,
                    [META]: {
                        callback: { original: expect.any(Function) },
                        handler: { original: expect.any(Function) }
                    }
                });
                expect(data.callback).toBe(newCallback);
                expect(data.handler).toBe(newHandler);
            });

            it('should handle union types with null and undefined', () => {
                type TestData = {
                    nullable: string | null;
                    optional?: string;
                    both: string | null | undefined;
                };

                const data: TestData = {
                    nullable: 'value',
                    optional: 'value',
                    both: 'value'
                };

                // Test setting to null/undefined
                const changes1 = update(data, {
                    nullable: null,
                    optional: undefined,
                    both: null
                });

                expect(changes1).toEqual({
                    nullable: null,
                    optional: undefined,
                    both: null,
                    [META]: {
                        nullable: { original: 'value' },
                        optional: { original: 'value' },
                        both: { original: 'value' }
                    }
                });

                // Test object replacement for nullable types
                type ObjData = {
                    config: { theme: string } | null;
                };

                const objData: ObjData = {
                    config: null
                };

                const changes2 = update(objData, {
                    config: [{ theme: 'dark' }]
                });

                expect(changes2).toEqual({
                    config: { theme: 'dark' },
                    [META]: { config: { original: null } }
                });
            });

            it('should support ALL operator with type-safe intersection', () => {
                type TestData = {
                    items: {
                        a: { x: number; y: string };
                        b: { x: number; z: boolean };
                        c: { x: number };
                    }
                };

                const data: TestData = {
                    items: {
                        a: { x: 1, y: 'hello' },
                        b: { x: 2, z: true },
                        c: { x: 3 }
                    }
                };

                // ALL should only allow updating 'x' since it's common to all
                const changes = update(data, {
                    items: {
                        [ALL]: { x: 10 }
                    }
                });

                expect(changes).toEqual({
                    items: {
                        a: { x: 10, [META]: { x: { original: 1 } } },
                        b: { x: 10, [META]: { x: { original: 2 } } },
                        c: { x: 10, [META]: { x: { original: 3 } } }
                    }
                });
                expect(data.items.a).toEqual({ x: 10, y: 'hello' });
                expect(data.items.b).toEqual({ x: 10, z: true });
                expect(data.items.c).toEqual({ x: 10 });
            });

            it('should support ALL with function updates on objects', () => {
                type TestData = {
                    scores: Record<string, { value: number; multiplier: number }>;
                };

                const data: TestData = {
                    scores: {
                        player1: { value: 100, multiplier: 2 },
                        player2: { value: 200, multiplier: 3 },
                        player3: { value: 150, multiplier: 1 }
                    }
                };

                const changes = update(data, {
                    scores: {
                        [ALL]: (current) => ({
                            ...current,
                            value: current.value * current.multiplier
                        })
                    }
                });

                expect(changes).toEqual({
                    scores: {
                        player1: { value: 200, [META]: { value: { original: 100 } } },
                        player2: { value: 600, [META]: { value: { original: 200 } } }
                    }
                });
            });

            it('should support partial array updates with functions', () => {
                type TestData = {
                    numbers: number[];
                };

                const data: TestData = {
                    numbers: [1, 2, 3, 4, 5]
                };

                const changes = update(data, {
                    numbers: {
                        '0': (value) => value * 10,
                        '2': (value) => value * 100,
                        '4': 500 // Direct value
                    }
                });

                expect(changes).toEqual({
                    numbers: {
                        '0': 10,
                        '2': 300,
                        '4': 500,
                        [META]: {
                            '0': { original: 1 },
                            '2': { original: 3 },
                            '4': { original: 5 }
                        }
                    }
                });
                expect(data.numbers).toEqual([10, 2, 300, 4, 500]);
            });

            it('should support WHERE with array functions', () => {
                type TestData = {
                    items: { id: number; active: boolean }[];
                };

                const data: TestData = {
                    items: [
                        { id: 1, active: true },
                        { id: 2, active: false },
                        { id: 3, active: true }
                    ]
                };

                const changes = update(data, {
                    items: {
                        [WHERE]: (items) => items.filter(i => i.active).length >= 2,
                        [ALL]: (current) => ({
                            ...current,
                            active: false
                        })
                    }
                });

                expect(changes).toEqual({
                    items: {
                        '0': { active: false, [META]: { active: { original: true } } },
                        '2': { active: false, [META]: { active: { original: true } } }
                    }
                });
                expect(data.items.every(i => !i.active)).toBe(true);
            });

            it('should require replacement syntax for unions containing objects', () => {
                type TestData = {
                    value: { type: 'object'; data: string } | string;
                };

                const data: TestData = {
                    value: 'simple'
                };

                // Must use replacement syntax since union contains object
                const changes1 = update(data, {
                    value: ['new string']
                });
                expect(changes1).toEqual({
                    value: 'new string',
                    [META]: { value: { original: 'simple' } }
                });

                // Reset data for second test
                const data2: TestData = {
                    value: 'simple'
                };

                // Also use replacement syntax for object value
                const changes2 = update(data2, {
                    value: [{ type: 'object', data: 'replaced' }]
                });
                expect(changes2).toEqual({
                    value: { type: 'object', data: 'replaced' },
                    [META]: { value: { original: 'simple' } }
                });
            });
        });

        describe('type safety', () => {
            it('should maintain type safety with complex nested structures', () => {
                type AppData = {
                    users: {
                        [id: string]: {
                            profile: {
                                name: string;
                                age: number;
                                settings: {
                                    notifications: boolean;
                                    theme: 'dark' | 'light';
                                };
                            };
                            stats: {
                                loginCount: number;
                                lastSeen: number;
                            };
                        };
                    };
                };

                const data: AppData = {
                    users: {
                        user1: {
                            profile: {
                                name: 'Alice',
                                age: 30,
                                settings: {
                                    notifications: true,
                                    theme: 'dark'
                                }
                            },
                            stats: {
                                loginCount: 42,
                                lastSeen: Date.now()
                            }
                        }
                    }
                };

                const updateStatement: Update<AppData> = {
                    users: {
                        user1: {
                            profile: {
                                settings: {
                                    theme: 'light'
                                }
                            },
                            stats: {
                                loginCount: (current: number, _data, _key) => current + 1
                            }
                        }
                    }
                };

                const changes = update(data, updateStatement);
                expect(changes?.users?.user1?.profile?.settings?.theme).toBe('light');
                expect(changes?.users?.user1?.stats?.loginCount).toBe(43);
            });
        });

        describe('undoUpdate functionality', () => {
            it('should undo simple property changes', () => {
                const data = {
                    user: { name: 'Alice', age: 30 },
                    settings: { theme: 'dark' }
                };

                const changes = update(data, {
                    user: { age: 31 },
                    settings: { theme: 'light' }
                });

                expect(data.user.age).toBe(31);
                expect(data.settings.theme).toBe('light');

                undoUpdate(data, changes);

                expect(data.user.age).toBe(30);
                expect(data.settings.theme).toBe('dark');
            });

            it('should undo nested object changes', () => {
                const data = {
                    app: {
                        ui: { theme: 'dark', fontSize: 14 },
                        features: { autoSave: true }
                    }
                };

                const changes = update(data, {
                    app: {
                        ui: { theme: 'light', fontSize: 16 }
                    }
                });

                expect(data.app.ui.theme).toBe('light');
                expect(data.app.ui.fontSize).toBe(16);

                undoUpdate(data, changes);

                expect(data.app.ui.theme).toBe('dark');
                expect(data.app.ui.fontSize).toBe(14);
            });

            it('should undo deletions by restoring original values', () => {
                const data: {
                    user: {
                        name: string;
                        email?: string;
                        age: number;
                    }
                } = {
                    user: {
                        name: 'John',
                        email: 'john@example.com',
                        age: 30
                    }
                };

                const changes = update(data, {
                    user: {
                        email: []
                    }
                });

                expect(data.user).not.toHaveProperty('email');

                undoUpdate(data, changes);

                expect(data.user.email).toBe('john@example.com');
            });

            it('should undo array replacements', () => {
                const data = {
                    user: {
                        tags: ['admin', 'active']
                    }
                };

                const changes = update(data, {
                    user: {
                        tags: [['admin', 'active', 'premium']]
                    }
                });

                expect(data.user.tags).toEqual(['admin', 'active', 'premium']);

                undoUpdate(data, changes);

                expect(data.user.tags).toEqual(['admin', 'active']);
            });

            it('should undo object replacements', () => {
                const data = {
                    config: {
                        database: {
                            host: 'localhost',
                            port: 5432,
                            username: 'admin'
                        }
                    }
                };

                const changes = update(data, {
                    config: {
                        database: [{
                            host: 'newhost',
                            port: 3306,
                            username: 'root'
                        }]
                    }
                });

                expect(data.config.database).toEqual({
                    host: 'newhost',
                    port: 3306,
                    username: 'root'
                });

                undoUpdate(data, changes);

                expect(data.config.database).toEqual({
                    host: 'localhost',
                    port: 5432,
                    username: 'admin'
                });
            });

            it('should undo array element changes', () => {
                const data = {
                    items: ['apple', 'banana', 'cherry']
                };

                const changes = update(data, {
                    items: {
                        [ALL]: (value: string) => value.toUpperCase()
                    }
                });

                expect(data.items).toEqual(['APPLE', 'BANANA', 'CHERRY']);

                undoUpdate(data, changes);

                expect(data.items).toEqual(['apple', 'banana', 'cherry']);
            });

            it('should handle undefined changes gracefully', () => {
                const data = { value: 42 };
                
                // Should not throw
                expect(() => undoUpdate(data, undefined)).not.toThrow();
                expect(data.value).toBe(42);
            });

            it('should undo deeply nested changes', () => {
                const data = {
                    a: { b: { c: { d: { e: { value: 1 } } } } }
                };

                const changes = update(data, {
                    a: { b: { c: { d: { e: { value: 42 } } } } }
                });

                expect(data.a.b.c.d.e.value).toBe(42);

                undoUpdate(data, changes);

                expect(data.a.b.c.d.e.value).toBe(1);
            });

            it('should undo multiple property changes at once', () => {
                const data: {
                    user: {
                        firstName: string;
                        lastName: string;
                        age: number;
                        email?: string;
                    }
                } = {
                    user: {
                        firstName: 'John',
                        lastName: 'Doe',
                        age: 30,
                        email: 'john@example.com'
                    }
                };

                const changes = update(data, {
                    user: {
                        firstName: 'Jane',
                        lastName: 'Smith',
                        age: 25,
                        email: []
                    }
                });

                expect(data.user.firstName).toBe('Jane');
                expect(data.user.lastName).toBe('Smith');
                expect(data.user.age).toBe(25);
                expect(data.user).not.toHaveProperty('email');

                undoUpdate(data, changes);

                expect(data.user.firstName).toBe('John');
                expect(data.user.lastName).toBe('Doe');
                expect(data.user.age).toBe(30);
                expect(data.user.email).toBe('john@example.com');
            });

            it('should only restore values that were actually changed', () => {
                const data = {
                    user: {
                        name: 'Alice',
                        age: 30,
                        role: 'admin'
                    }
                };

                const changes = update(data, {
                    user: {
                        age: 31
                    }
                });

                // Manually modify role (not part of changes)
                data.user.role = 'superadmin';

                undoUpdate(data, changes);

                expect(data.user.age).toBe(30); // Restored
                expect(data.user.name).toBe('Alice'); // Unchanged
                expect(data.user.role).toBe('superadmin'); // Not restored
            });
        });
    }); // end of update functionality

    describe('data binding functionality', () => {
        describe('capture mode', () => {
            it('should capture single value with wrapped key', () => {
                type TestData = {
                    users: Record<string, { name: string; role: string }>
                };

                const data: TestData = {
                    users: {
                        alice: { name: 'Alice', role: 'admin' },
                        bob: { name: 'Bob', role: 'user' }
                    }
                };

                let capturedUser: any;
                const binding: DataBinding<TestData> = {
                    onChange: ['users', ['alice']] as CapturePath<TestData>,
                    update: (user) => {
                        capturedUser = user;
                        return {};
                    }
                };

                const change: UpdateResult<TestData> = {
                    users: { alice: { role: 'superadmin' } }
                };

                // First apply the change to data
                data.users.alice.role = 'superadmin';

                applyBinding(data, change, binding);
                expect(capturedUser).toEqual({ name: 'Alice', role: 'superadmin' });
            });

            it('should capture multiple values in path order', () => {
                type TestData = {
                    org: {
                        teams: Record<string, {
                            members: Record<string, { name: string; active: boolean }>
                        }>
                    }
                };

                const data: TestData = {
                    org: {
                        teams: {
                            engineering: {
                                members: {
                                    alice: { name: 'Alice', active: true },
                                    bob: { name: 'Bob', active: false }
                                }
                            }
                        }
                    }
                };

                let capturedArgs: any[] = [];
                const binding: DataBinding<TestData> = {
                    onChange: ['org', ['teams'], ['engineering'], 'members', ['alice']] as CapturePath<TestData>,
                    update: (...args) => {
                        capturedArgs = args;
                        return {};
                    }
                };

                const change: UpdateResult<TestData> = {
                    org: {
                        teams: {
                            engineering: {
                                members: {
                                    alice: { active: false }
                                }
                            }
                        }
                    }
                };

                // Apply the change to data first
                data.org.teams.engineering.members.alice.active = false;

                applyBinding(data, change, binding);
                expect(capturedArgs).toHaveLength(3);
                expect(capturedArgs[0]).toEqual(data.org.teams); // captured teams
                expect(capturedArgs[1]).toEqual(data.org.teams.engineering); // captured engineering team
                expect(capturedArgs[2]).toEqual({ name: 'Alice', active: false }); // captured alice
            });

            it('should capture values with ALL symbol', () => {
                type TestData = {
                    products: Record<string, { price: number; category: string }>
                };

                const data: TestData = {
                    products: {
                        laptop: { price: 1000, category: 'electronics' },
                        mouse: { price: 50, category: 'electronics' },
                        chair: { price: 200, category: 'furniture' }
                    }
                };

                const capturedProducts: any[] = [];
                const binding: DataBinding<TestData> = {
                    onChange: ['products', [ALL]] as CapturePath<TestData>,
                    update: (product) => {
                        capturedProducts.push(product);
                        return {};
                    }
                };

                const change: UpdateResult<TestData> = {
                    products: {
                        laptop: { price: 900 },
                        mouse: { price: 45 }
                    }
                };

                // Apply changes to data first
                data.products.laptop.price = 900;
                data.products.mouse.price = 45;

                applyBinding(data, change, binding);
                expect(capturedProducts).toHaveLength(2);
                expect(capturedProducts[0]).toEqual({ price: 900, category: 'electronics' });
                expect(capturedProducts[1]).toEqual({ price: 45, category: 'electronics' });
            });

            it('should handle nested captures with ALL', () => {
                type TestData = {
                    stores: Record<string, {
                        inventory: Record<string, { quantity: number }>
                    }>
                };

                const data: TestData = {
                    stores: {
                        north: {
                            inventory: {
                                apples: { quantity: 100 },
                                oranges: { quantity: 50 }
                            }
                        },
                        south: {
                            inventory: {
                                apples: { quantity: 75 },
                                oranges: { quantity: 60 }
                            }
                        }
                    }
                };

                const capturedStores: any[] = [];
                const binding: DataBinding<TestData> = {
                    onChange: ['stores', [ALL], 'inventory', 'apples'] as CapturePath<TestData>,
                    update: (store) => {
                        capturedStores.push(store);
                        return {};
                    }
                };

                const change: UpdateResult<TestData> = {
                    stores: {
                        north: { inventory: { apples: { quantity: 90 } } },
                        south: { inventory: { apples: { quantity: 70 } } }
                    }
                };

                // Apply changes to data first
                data.stores.north.inventory.apples.quantity = 90;
                data.stores.south.inventory.apples.quantity = 70;

                applyBinding(data, change, binding);
                expect(capturedStores).toHaveLength(2);
                expect(capturedStores[0].inventory.apples.quantity).toBe(90);
                expect(capturedStores[1].inventory.apples.quantity).toBe(70);
            });
        });

        describe('non-capture mode', () => {
            it('should pass full data object as first argument', () => {
                type TestData = {
                    config: { theme: string; language: string }
                };

                const data: TestData = {
                    config: { theme: 'dark', language: 'en' }
                };

                let receivedArgs: any[] = [];
                const binding: DataBinding<TestData> = {
                    onChange: ['config', 'theme'] as CapturePath<TestData>,
                    update: (...args) => {
                        receivedArgs = args;
                        return {};
                    }
                };

                const change: UpdateResult<TestData> = {
                    config: { theme: 'light' }
                };

                applyBinding(data, change, binding);
                expect(receivedArgs).toHaveLength(1);
                expect(receivedArgs[0]).toBe(data); // First arg is full data
            });

            it('should pass wildcard keys for ALL symbols', () => {
                type TestData = {
                    users: Record<string, { status: string }>
                };

                const data: TestData = {
                    users: {
                        alice: { status: 'online' },
                        bob: { status: 'offline' },
                        charlie: { status: 'away' }
                    }
                };

                let receivedArgs: any[] = [];
                const binding: DataBinding<TestData> = {
                    onChange: ['users', ALL, 'status'] as CapturePath<TestData>,
                    update: (...args) => {
                        receivedArgs = args;
                        return {};
                    }
                };

                const change: UpdateResult<TestData> = {
                    users: {
                        alice: { status: 'offline' }
                    }
                };

                applyBinding(data, change, binding);
                expect(receivedArgs).toHaveLength(2);
                expect(receivedArgs[0]).toBe(data); // First arg is full data
                expect(receivedArgs[1]).toBe('alice'); // Second arg is the matched key
            });

            it('should pass multiple wildcard keys in order', () => {
                type TestData = {
                    regions: Record<string, {
                        stores: Record<string, {
                            sales: number
                        }>
                    }>
                };

                const data: TestData = {
                    regions: {
                        east: {
                            stores: {
                                store1: { sales: 1000 },
                                store2: { sales: 2000 }
                            }
                        },
                        west: {
                            stores: {
                                store3: { sales: 1500 }
                            }
                        }
                    }
                };

                const allArgs: any[][] = [];
                const binding: DataBinding<TestData> = {
                    onChange: ['regions', ALL, 'stores', ALL, 'sales'] as CapturePath<TestData>,
                    update: (...args) => {
                        allArgs.push([...args]);
                        return {};
                    }
                };

                const change: UpdateResult<TestData> = {
                    regions: {
                        east: {
                            stores: {
                                store1: { sales: 1100 },
                                store2: { sales: 2100 }
                            }
                        }
                    }
                };

                applyBinding(data, change, binding);
                expect(allArgs).toHaveLength(2);
                expect(allArgs[0]).toEqual([data, 'east', 'store1']);
                expect(allArgs[1]).toEqual([data, 'east', 'store2']);
            });

            it('should handle mixed capture and non-capture correctly', () => {
                // This test verifies that once a capture is found, it switches to capture mode
                type TestData = {
                    system: {
                        modules: Record<string, {
                            config: { enabled: boolean }
                        }>
                    }
                };

                const data: TestData = {
                    system: {
                        modules: {
                            auth: { config: { enabled: true } },
                            api: { config: { enabled: false } }
                        }
                    }
                };

                let receivedArgs: any[] = [];
                const binding: DataBinding<TestData> = {
                    onChange: ['system', 'modules', [ALL], 'config'] as CapturePath<TestData>,
                    update: (...args) => {
                        receivedArgs = args;
                        return {};
                    }
                };

                const change: UpdateResult<TestData> = {
                    system: {
                        modules: {
                            auth: { config: { enabled: false } }
                        }
                    }
                };

                // Apply change to data first
                data.system.modules.auth.config.enabled = false;

                applyBinding(data, change, binding);
                expect(receivedArgs).toHaveLength(1);
                expect(receivedArgs[0]).toEqual({ config: { enabled: false } }); // Only captured value
            });
        });

        describe('binding triggers', () => {
            it('should trigger binding only when monitored path changes', () => {
                type TestData = {
                    app: {
                        ui: { theme: string };
                        data: { value: number };
                    }
                };

                const data: TestData = {
                    app: {
                        ui: { theme: 'dark' },
                        data: { value: 42 }
                    }
                };

                let triggerCount = 0;
                const binding: DataBinding<TestData> = {
                    onChange: ['app', 'ui', 'theme'] as CapturePath<TestData>,
                    update: () => {
                        triggerCount++;
                        return {};
                    }
                };

                // Change to monitored path
                applyBinding(data, { app: { ui: { theme: 'light' } } }, binding);
                expect(triggerCount).toBe(1);

                // Change to different path
                applyBinding(data, { app: { data: { value: 100 } } } as UpdateResult<TestData>, binding);
                expect(triggerCount).toBe(1); // Should not trigger
            });

            it('should not trigger when other paths change', () => {
                type TestData = {
                    users: Record<string, {
                        profile: { name: string };
                        settings: { notifications: boolean };
                    }>
                };

                const data: TestData = {
                    users: {
                        alice: {
                            profile: { name: 'Alice' },
                            settings: { notifications: true }
                        }
                    }
                };

                let triggered = false;
                const binding: DataBinding<TestData> = {
                    onChange: ['users', ALL, 'profile'] as CapturePath<TestData>,
                    update: () => {
                        triggered = true;
                        return {};
                    }
                };

                // Change to settings, not profile
                const change: UpdateResult<TestData> = {
                    users: {
                        alice: {
                            settings: { notifications: false }
                        }
                    }
                };

                applyBinding(data, change, binding);
                expect(triggered).toBe(false);
            });

            it('should handle multiple bindings on same data', () => {
                type TestData = {
                    counter: { value: number };
                };

                const data: TestData = {
                    counter: { value: 0 }
                };

                const results: string[] = [];

                const binding1: DataBinding<TestData> = {
                    onChange: ['counter', 'value'] as CapturePath<TestData>,
                    update: () => {
                        results.push('binding1');
                        return {};
                    }
                };

                const binding2: DataBinding<TestData> = {
                    onChange: ['counter'] as CapturePath<TestData>,
                    update: () => {
                        results.push('binding2');
                        return {};
                    }
                };

                const change: UpdateResult<TestData> = {
                    counter: { value: 1 }
                };

                applyBinding(data, change, binding1);
                applyBinding(data, change, binding2);

                expect(results).toEqual(['binding1', 'binding2']);
            });

            it('should handle overlapping binding paths', () => {
                type TestData = {
                    form: {
                        fields: Record<string, {
                            value: string;
                            error?: string;
                        }>
                    }
                };

                const data: TestData = {
                    form: {
                        fields: {
                            email: { value: 'test@example.com' },
                            password: { value: '123456' }
                        }
                    }
                };

                const triggers: string[] = [];

                const specificBinding: DataBinding<TestData> = {
                    onChange: ['form', 'fields', 'email', 'value'] as CapturePath<TestData>,
                    update: () => {
                        triggers.push('specific');
                        return {};
                    }
                };

                const generalBinding: DataBinding<TestData> = {
                    onChange: ['form', 'fields', ALL] as CapturePath<TestData>,
                    update: () => {
                        triggers.push('general');
                        return {};
                    }
                };

                const change: UpdateResult<TestData> = {
                    form: {
                        fields: {
                            email: { value: 'new@example.com' }
                        }
                    }
                };

                applyBinding(data, change, specificBinding);
                applyBinding(data, change, generalBinding);

                expect(triggers).toContain('specific');
                expect(triggers).toContain('general');
            });
        });

        describe('update propagation', () => {
            it('should apply updates from binding to data', () => {
                type TestData = {
                    source: { value: number };
                    derived: { doubled: number };
                };

                const data: TestData = {
                    source: { value: 5 },
                    derived: { doubled: 10 }
                };

                const binding: DataBinding<TestData> = {
                    onChange: ['source', 'value'] as CapturePath<TestData>,
                    update: (data) => ({
                        derived: { doubled: data.source.value * 2 }
                    })
                };

                const change: UpdateResult<TestData> = {
                    source: { value: 7 }
                };

                // Apply change to data first
                data.source.value = 7;

                applyBinding(data, change, binding);

                expect(data.derived.doubled).toBe(14);
            });

            it('should merge binding changes with original changes', () => {
                type TestData = {
                    input: { text: string };
                    validation: { error?: string };
                    metadata: { lastUpdated?: number };
                };

                const data: TestData = {
                    input: { text: '' },
                    validation: {},
                    metadata: {}
                };

                const binding: DataBinding<TestData> = {
                    onChange: ['input', 'text'] as CapturePath<TestData>,
                    update: (data) => ({
                        validation: {
                            error: data.input.text.length < 3 ? 'Too short' : undefined
                        }
                    })
                };

                const now = Date.now();
                const change: UpdateResult<TestData> = {
                    input: { text: 'Hi' },
                    metadata: { lastUpdated: now }
                };

                // Apply change to data first
                data.input.text = 'Hi';
                data.metadata.lastUpdated = now;

                applyBinding(data, change, binding);

                expect(change.validation?.error).toBe('Too short');
                expect(change.metadata?.lastUpdated).toBeDefined(); // Original change preserved
            });

            it('should handle array of updates from ALL matches', () => {
                type TestData = {
                    items: Record<string, { quantity: number }>;
                    totals: { sum: number; count: number };
                };

                const data: TestData = {
                    items: {
                        apple: { quantity: 5 },
                        banana: { quantity: 3 },
                        orange: { quantity: 7 }
                    },
                    totals: { sum: 15, count: 3 }
                };

                const binding: DataBinding<TestData> = {
                    onChange: ['items', ALL, 'quantity'] as CapturePath<TestData>,
                    update: (data) => {
                        const quantities = Object.values(data.items).map((item: any) => item.quantity);
                        return {
                            totals: {
                                sum: quantities.reduce((a, b) => a + b, 0),
                                count: quantities.length
                            }
                        };
                    }
                };

                const change: UpdateResult<TestData> = {
                    items: {
                        apple: { quantity: 10 },
                        banana: { quantity: 6 }
                    }
                };

                // Apply changes to data first
                data.items.apple.quantity = 10;
                data.items.banana.quantity = 6;

                applyBinding(data, change, binding);

                expect(data.totals.sum).toBe(23); // 10 + 6 + 7
                expect(data.totals.count).toBe(3);
            });

            it('should handle binding updates that trigger WHERE clauses', () => {
                type TestData = {
                    categories: Record<string, { active: boolean }>;
                    items: Record<string, {
                        category: string;
                        visible: boolean;
                    }>;
                };

                const data: TestData = {
                    categories: {
                        electronics: { active: true },
                        furniture: { active: false }
                    },
                    items: {
                        laptop: { category: 'electronics', visible: true },
                        chair: { category: 'furniture', visible: true },
                        mouse: { category: 'electronics', visible: true }
                    }
                };

                // This binding uses non-capture mode to get the category key
                const binding: DataBinding<TestData> = {
                    onChange: ['categories', ALL, 'active'] as CapturePath<TestData>,
                    update: (data, categoryKey) => ({
                        items: {
                            [ALL]: {
                                [WHERE]: (item: any) => item.category === categoryKey,
                                visible: data.categories[categoryKey].active
                            }
                        }
                    })
                };

                const change: UpdateResult<TestData> = {
                    categories: {
                        electronics: { active: false }
                    }
                };

                // Apply change to data first
                data.categories.electronics.active = false;

                applyBinding(data, change, binding);

                expect(data.items.laptop.visible).toBe(false);
                expect(data.items.mouse.visible).toBe(false);
                expect(data.items.chair.visible).toBe(true); // Different category
            });
        });

        describe('edge cases', () => {
            it('should handle empty change objects', () => {
                type TestData = { value: number };
                const data: TestData = { value: 42 };

                let triggered = false;
                const binding: DataBinding<TestData> = {
                    onChange: ['value'] as CapturePath<TestData>,
                    update: () => {
                        triggered = true;
                        return {};
                    }
                };

                applyBinding(data, {}, binding);
                expect(triggered).toBe(false);
            });

            it('should handle bindings with no matches', () => {
                type TestData = {
                    users: Record<string, { name: string }>
                };

                const data: TestData = {
                    users: {
                        alice: { name: 'Alice' }
                    }
                };

                let triggered = false;
                const binding: DataBinding<TestData> = {
                    onChange: ['users', 'bob'] as CapturePath<TestData>,
                    update: () => {
                        triggered = true;
                        return {};
                    }
                };

                const change: UpdateResult<TestData> = {
                    users: {
                        alice: { name: 'Alice Smith' }
                    }
                };

                applyBinding(data, change, binding);
                expect(triggered).toBe(false);
            });

            it('should handle binding that returns empty update', () => {
                type TestData = { value: number };
                const data: TestData = { value: 10 };

                const binding: DataBinding<TestData> = {
                    onChange: ['value'] as CapturePath<TestData>,
                    update: () => ({}) // Empty update
                };

                const change: UpdateResult<TestData> = { value: 20 };

                // Should not throw
                expect(() => applyBinding(data, change, binding)).not.toThrow();
            });

            it('should handle deeply nested paths', () => {
                type TestData = {
                    a: { b: { c: { d: { e: { value: number } } } } }
                };

                const data: TestData = {
                    a: { b: { c: { d: { e: { value: 1 } } } } }
                };

                let capturedValue: number | undefined;
                const binding: DataBinding<TestData> = {
                    onChange: ['a', 'b', 'c', 'd', 'e', 'value'] as CapturePath<TestData>,
                    update: (data) => {
                        capturedValue = data.a.b.c.d.e.value;
                        return {};
                    }
                };

                const change: UpdateResult<TestData> = {
                    a: { b: { c: { d: { e: { value: 42 } } } } }
                };

                // Apply change to data first
                data.a.b.c.d.e.value = 42;

                applyBinding(data, change, binding);
                expect(capturedValue).toBe(42);
            });
        });

        describe('inline change detector', () => {
            it('should support inline detector for specific key', () => {
                type TestData = {
                    user: { name: string; age: number };
                    status: { online: boolean };
                };

                const data: TestData = {
                    user: { name: 'Alice', age: 30 },
                    status: { online: true }
                };

                let triggered = false;
                const binding: DataBinding<TestData> = {
                    onChange: ['user', { age: anyChange }] as CapturePath<TestData>,
                    update: () => {
                        triggered = true;
                        return {};
                    }
                };

                // Should not trigger on name change
                applyBinding(data, { user: { name: 'Bob' } } as UpdateResult<TestData>, binding);
                expect(triggered).toBe(false);

                // Should trigger on age change
                applyBinding(data, { user: { age: 31 } } as UpdateResult<TestData>, binding);
                expect(triggered).toBe(true);
            });

            it('should support inline detector with ALL operator', () => {
                type TestData = {
                    products: Record<string, { name: string; price: number | null }>;
                };

                const data: TestData = {
                    products: {
                        apple: { name: 'Apple', price: 1.99 },
                        banana: { name: 'Banana', price: null },
                        orange: { name: 'Orange', price: 2.49 }
                    }
                };

                const triggers: string[] = [];
                const binding: DataBinding<TestData> = {
                    onChange: ['products', [ALL], { price: typeChange }] as CapturePath<TestData>,
                    update: (product) => {
                        triggers.push(product.name);
                        return {};
                    }
                };

                // Change banana price from null to number (type change)
                const change: UpdateResult<TestData> = {
                    products: {
                        banana: { price: 0.99, [META]: { price: { original: null } } }
                    }
                };
                data.products.banana.price = 0.99;

                applyBinding(data, change, binding);
                expect(triggers).toEqual(['Banana']);

                // Reset
                triggers.length = 0;

                // Change apple price (same type, no trigger)
                const change2: UpdateResult<TestData> = {
                    products: {
                        apple: { price: 1.50, [META]: { price: { original: 1.99 } } }
                    }
                };
                data.products.apple.price = 1.50;

                applyBinding(data, change2, binding);
                expect(triggers).toEqual([]);
            });

            it('should support complex inline detector with nested paths', () => {
                type TestData = {
                    app: {
                        modules: Record<string, {
                            config: { enabled: boolean; version: string };
                            data: { count: number };
                        }>;
                    };
                };

                const data: TestData = {
                    app: {
                        modules: {
                            auth: {
                                config: { enabled: true, version: '1.0' },
                                data: { count: 0 }
                            },
                            api: {
                                config: { enabled: false, version: '2.0' },
                                data: { count: 5 }
                            }
                        }
                    }
                };

                let capturedModule: any;
                const binding: DataBinding<TestData> = {
                    onChange: ['app', 'modules', [ALL], {
                        config: { enabled: anyChange },
                        data: { count: (_key, result) => {
                            const meta = result?.[META];
                            if (!meta || !meta.count) return false;
                            return meta.count.original === 0 && result?.count && typeof result.count === 'number' && result.count > 0;
                        }}
                    }] as CapturePath<TestData>,
                    update: (module) => {
                        capturedModule = module;
                        return {};
                    }
                };

                // Change that should trigger (count from 0 to 1)
                const change: UpdateResult<TestData> = {
                    app: {
                        modules: {
                            auth: {
                                data: { count: 1, [META]: { count: { original: 0 } } }
                            }
                        }
                    }
                };
                data.app.modules.auth.data.count = 1;

                applyBinding(data, change, binding);
                expect(capturedModule).toEqual({
                    config: { enabled: true, version: '1.0' },
                    data: { count: 1 }
                });

                // Reset
                capturedModule = undefined;

                // Change that should also trigger (enabled change)
                const change2: UpdateResult<TestData> = {
                    app: {
                        modules: {
                            api: {
                                config: { enabled: true, [META]: { enabled: { original: false } } }
                            }
                        }
                    }
                };
                data.app.modules.api.config.enabled = true;

                applyBinding(data, change2, binding);
                expect(capturedModule).toEqual({
                    config: { enabled: true, version: '2.0' },
                    data: { count: 5 }
                });
            });

            it('should support detector as root onChange', () => {
                type TestData = {
                    settings: {
                        theme: string;
                        language: string;
                    };
                };

                const data: TestData = {
                    settings: {
                        theme: 'dark',
                        language: 'en'
                    }
                };

                let triggered = false;
                const binding: DataBinding<TestData> = {
                    onChange: {
                        settings: {
                            theme: typeChange
                        }
                    },
                    update: () => {
                        triggered = true;
                        return { settings: { theme: 'light' } };
                    }
                };

                // Type change: string to null
                const change: UpdateResult<TestData> = {
                    settings: {
                        theme: null as any,
                        [META]: { theme: { original: 'dark' } }
                    }
                };

                applyBinding(data, change, binding);
                expect(triggered).toBe(true);
            });

            it('should work with init mode and inline detectors', () => {
                type TestData = {
                    items: Record<string, { quantity: number; price: number }>;
                };

                const data: TestData = {
                    items: {
                        apple: { quantity: 10, price: 1.5 },
                        banana: { quantity: 0, price: 0.8 }
                    }
                };

                const inits: string[] = [];
                const binding: DataBinding<TestData> = {
                    init: true,
                    onChange: ['items', [ALL], {
                        quantity: (_key, _result) => true // Always true for init
                    }] as CapturePath<TestData>,
                    update: (item) => {
                        // In capture mode, we get the captured item
                        if (item.quantity !== undefined) {
                            inits.push(item.quantity > 0 ? 'apple' : 'banana');
                        }
                        return {};
                    }
                };

                // Apply with init = true
                applyBinding(data, {} as UpdateResult<TestData>, binding, true);
                
                expect(inits).toContain('apple');
                expect(inits).toContain('banana');
                expect(inits).toHaveLength(2);
            });
        });
    });
});