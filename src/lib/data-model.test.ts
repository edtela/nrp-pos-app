import { describe, it, expect } from 'vitest';
import { update, applyBinding } from './data-model';
import { ALL, CapturePath, DataBinding, DataChange, Update, WHERE } from './data-model-types';



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
                    user: { age: 31 },
                    settings: { theme: 'light' }
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
                        ui: { theme: 'light' }
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
                        name: (current: string) => current.toUpperCase(),
                        score: (current: number) => current * 2
                    }
                });

                expect(changes).toEqual({
                    user: { name: 'ALICE', score: 200 }
                });
                expect(data.user.name).toBe('ALICE');
                expect(data.user.score).toBe(200);
            });

            it('should handle functions that return nested updates', () => {
                const data = {
                    counter: { value: 5, metadata: { lastUpdate: 0 } }
                };

                const changes = update(data, {
                    counter: (current) => ({
                        value: current.value + 1,
                        metadata: { lastUpdate: Date.now() }
                    })
                });

                expect(changes?.counter?.value).toBe(6);
                expect(changes?.counter?.metadata?.lastUpdate).toBeGreaterThan(0);
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
                        user1: { status: 'pending' },
                        user2: { status: 'pending' },
                        user3: { status: 'pending' }
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
                            price: (current: number) => Math.round(current * 1.1)
                        }
                    }
                });

                expect(changes).toEqual({
                    products: {
                        prod1: { price: 110 },
                        prod2: { price: 220 },
                        prod3: { price: 330 }
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
                        item1: { value: 10 },
                        item2: { value: 20 }, // Specific value takes precedence
                        item3: { value: 10 }
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
                            [WHERE]: (user: any) => user.age >= 65,
                            category: 'senior'
                        }
                    }
                });

                expect(changes).toEqual({
                    users: {
                        user2: { category: 'senior' },
                        user3: { category: 'senior' }
                    }
                });
                expect(data.users.user1.category).toBe('regular');
                expect(data.users.user2.category).toBe('senior');
                expect(data.users.user3.category).toBe('senior');
            });

            it('should work with nested WHERE conditions', () => {
                const data = {
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
                                    [WHERE]: (emp: any) => emp.years >= 5,
                                    salary: 100000
                                }
                            }
                        }
                    }
                });

                expect(changes?.departments?.eng?.employees).toEqual({
                    emp2: { salary: 100000 },
                    emp3: { salary: 100000 }
                });
                expect(changes?.departments?.sales?.employees).toEqual({
                    emp5: { salary: 100000 }
                });
            });
        });

        describe('edge cases', () => {
            it('should create nested objects when they do not exist', () => {
                const data = {
                    config: {} as { database?: { host?: string, port?: number } }
                };

                const changes = update(data, {
                    config: {
                        database: {
                            host: 'localhost',
                            port: 5432
                        }
                    }
                });

                expect(changes).toEqual({
                    config: {
                        database: {
                            host: 'localhost',
                            port: 5432
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
                        theme: {
                            primary: 'blue',
                            secondary: 'gray'
                        }
                    }
                });

                expect(changes).toEqual({
                    settings: {
                        theme: {
                            primary: 'blue',
                            secondary: 'gray'
                        }
                    }
                });
            });

            it('should handle empty updates', () => {
                const data = { user: { name: 'Alice' } };
                const changes = update(data, {});
                expect(changes).toBeUndefined();
            });

            it('should handle arrays as terminal values', () => {
                const data = {
                    user: {
                        tags: ['admin', 'active']
                    }
                };

                const changes = update(data, {
                    user: {
                        tags: ['admin', 'active', 'premium']
                    }
                });

                expect(changes).toEqual({
                    user: {
                        tags: ['admin', 'active', 'premium']
                    }
                });
                expect(data.user.tags).toHaveLength(3);
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
                                loginCount: (current: number) => current + 1
                            }
                        }
                    }
                };

                const changes = update(data, updateStatement);
                expect(changes?.users?.user1?.profile?.settings?.theme).toBe('light');
                expect(changes?.users?.user1?.stats?.loginCount).toBe(43);
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

                const change: DataChange<TestData> = {
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

                const change: DataChange<TestData> = {
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

                const change: DataChange<TestData> = {
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

                const change: DataChange<TestData> = {
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

                const change: DataChange<TestData> = {
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

                const change: DataChange<TestData> = {
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

                const change: DataChange<TestData> = {
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

                const change: DataChange<TestData> = {
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
                applyBinding(data, { app: { data: { value: 100 } } }, binding);
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
                const change: DataChange<TestData> = {
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

                const change: DataChange<TestData> = {
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

                const change: DataChange<TestData> = {
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

                const change: DataChange<TestData> = {
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
                const change: DataChange<TestData> = {
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

                const change: DataChange<TestData> = {
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

                const change: DataChange<TestData> = {
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

                const change: DataChange<TestData> = {
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

                const change: DataChange<TestData> = { value: 20 };

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

                const change: DataChange<TestData> = {
                    a: { b: { c: { d: { e: { value: 42 } } } } }
                };

                // Apply change to data first
                data.a.b.c.d.e.value = 42;

                applyBinding(data, change, binding);
                expect(capturedValue).toBe(42);
            });
        });
    });
});