declare const ALL: unique symbol;
declare const WHERE: unique symbol;
declare const DEFAULT: unique symbol;
declare const CONTEXT: unique symbol;
declare const META: unique symbol;

type StringKeys<T> = Extract<keyof T, string>;
type IsOptional<T, K extends keyof T> = {} extends Pick<T, K> ? true : false;
type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never;
type AllValueType<T> = T extends readonly any[] ? T[number] : UnionToIntersection<T[keyof T]>;
type DeepPartial<T> = T extends readonly any[] ? T : T extends object ? {
    [K in keyof T]?: DeepPartial<T[K]>;
} : T;
type DataChange<T> = UpdateResult<T>;
type UpdateTerminal<T> = [T] extends [Function] ? [T] : Extract<T, object> extends never ? T : [T];
type UpdateArray<T extends readonly any[]> = {
    [index: string]: T extends readonly (infer E)[] ? Update<E> | ((value: E, data: T, index: string, ctx?: Record<string, any>) => Update<E>) : never;
} & {
    [ALL]?: T extends readonly (infer E)[] ? Update<E> | ((value: E, data: T, index: number, ctx?: Record<string, any>) => Update<E>) : never;
};
type RecordUpdate<T> = AllValueType<T> extends any ? unknown extends AllValueType<T> ? {
    [key: string]: any;
} & {
    [ALL]?: any;
} : {
    [key: string]: Update<AllValueType<T>> | [] | ((value: AllValueType<T>, data: T, key: string, ctx?: Record<string, any>) => Update<AllValueType<T>>);
} & {
    [ALL]?: Update<AllValueType<T>> | ((value: AllValueType<T>, data: T, key: string, ctx?: Record<string, any>) => Update<AllValueType<T>>);
} : never;
type UpdateNonArrayObject<T extends object> = {
    [K in StringKeys<T>]?: Update<T[K]> | (IsOptional<T, K> extends true ? [] : never) | ((value: T[K], data: T, key: K, ctx?: Record<string, any>) => Update<T[K]>);
} & {
    [ALL]?: Update<AllValueType<T>> | ((value: AllValueType<T>, data: T, key: keyof T, ctx?: Record<string, any>) => Update<AllValueType<T>>);
};
type UpdateObject<T extends object> = (T extends readonly any[] ? UpdateArray<T> : string extends keyof T ? RecordUpdate<T> : UpdateNonArrayObject<T>) & {
    [WHERE]?: (value: T, context?: Record<string, any>) => boolean;
    [DEFAULT]?: T;
    [CONTEXT]?: Record<string, any>;
};
type Update<T> = [NonNullable<T>] extends [object] ? (undefined extends T ? undefined : never) | (null extends T ? null : never) | UpdateObject<NonNullable<T>> | [NonNullable<T>] : UpdateTerminal<T>;
type UpdateResult<T> = T extends readonly any[] ? {
    [index: string]: T extends readonly (infer E)[] ? ([E] extends [object] ? UpdateResult<E> : E) : never;
    [META]?: {
        [index: string]: T extends readonly (infer E)[] ? UpdateResultMeta<E> : never;
    };
} : {
    [K in StringKeys<T>]?: [T[K]] extends [object] ? UpdateResult<T[K]> : T[K];
} & {
    [META]?: {
        [K in StringKeys<T>]?: UpdateResultMeta<T[K]>;
    };
};
type UpdateResultMeta<T> = {
    original: T;
};
type ChangeDetectorFn<T> = (key: string, result?: UpdateResult<T>) => boolean;
type ArrayChangeDetector<T extends readonly any[]> = T extends readonly (infer E)[] ? {
    [index: string]: ChangeDetectorFn<T> | ([E] extends [object] ? ChangeDetector<E> : never);
} & {
    [ALL]?: ChangeDetectorFn<T> | ([E] extends [object] ? ChangeDetector<E> : never);
} : never;
type ObjectChangeDetector<T extends object> = {
    [K in StringKeys<T>]?: ChangeDetectorFn<T> | ([T[K]] extends [object] ? ChangeDetector<T[K]> : never);
} & {
    [ALL]?: ChangeDetectorFn<T> | ChangeDetector<AllValueType<T>>;
};
type ChangeDetector<T> = T extends readonly any[] ? ArrayChangeDetector<T> : T extends object ? ObjectChangeDetector<T> : never;
type Select<T> = T extends readonly any[] ? ArraySelect<T> : T extends object ? ObjectSelect<T> : never;
type ArraySelect<T extends readonly any[]> = T extends readonly (infer E)[] ? {
    [key: string]: boolean | Select<E>;
    [WHERE]?: (value: E) => boolean;
    [ALL]?: boolean | Select<E>;
} : never;
type ObjectSelect<T extends object> = string extends keyof T ? RecordSelect<T> : KnownKeysSelect<T>;
type RecordSelect<T> = {
    [key: string]: boolean | Select<AllValueType<T>>;
    [WHERE]?: (value: T) => boolean;
    [ALL]?: boolean | Select<AllValueType<T>>;
};
type KnownKeysSelect<T extends object> = {
    [K in StringKeys<T>]?: boolean | Select<T[K]>;
} & {
    [WHERE]?: (value: T) => boolean;
    [ALL]?: boolean | Select<AllValueType<T>>;
};
type SelectResult<T> = DeepPartial<T>;

declare function update<T extends object>(d: T, u?: Update<T>, c?: UpdateResult<T>): UpdateResult<T> | undefined;
declare function undo<T extends object>(data: T, result: UpdateResult<T> | undefined): any;
declare function transaction<T extends object>(data: T): {
    update(stmt: Update<T>): /*elided*/ any;
    commit: () => UpdateResult<T> | undefined;
    revert: () => void;
};

declare function select<T>(data: T, stmt: Select<T>): SelectResult<T> | undefined;

declare function hasChanges<T extends object>(result: UpdateResult<T> | undefined, detector: ChangeDetector<T>): boolean;
declare const anyChange: ChangeDetectorFn<any>;
declare const typeChange: ChangeDetectorFn<any>;

export { ALL, CONTEXT, type ChangeDetector, type ChangeDetectorFn, DEFAULT, type DataChange, META, type Select, type SelectResult, type Update, type UpdateResult, type UpdateResultMeta, WHERE, anyChange, hasChanges, select, transaction, typeChange, undo, update };
