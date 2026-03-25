import { type Client } from '@libsql/client';
import * as schema from './schema';
declare const client: Client;
export declare const db: any;
export { schema };
export { client };
export declare function initializeDatabase(): Promise<void>;
export default db;
//# sourceMappingURL=client.d.ts.map