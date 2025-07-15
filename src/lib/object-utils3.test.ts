import { describe, it, expect } from 'vitest';
import { update, ALL, WHERE, type DataStructure, type Update } from './object-utils3';

describe('object-utils3', () => {
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
            const data: DataStructure = {
                config: {}
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

            const changes = update(data as DataStructure, {
                settings: {
                    theme: {
                        primary: 'blue',
                        secondary: 'gray'
                    }
                }
            } as Update<DataStructure>);

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
});