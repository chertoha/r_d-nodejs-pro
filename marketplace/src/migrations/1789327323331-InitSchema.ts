import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1789327323331 implements MigrationInterface {
    name = 'InitSchema1789327323331'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "users" ("id" integer GENERATED ALWAYS AS IDENTITY NOT NULL, "email" character varying NOT NULL, "full_name" character varying NOT NULL, "role" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "CHK_bee9b10b910ada5c3ee5121870" CHECK ("role" IN ('buyer', 'seller')), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES ($1, $2, $3, $4, $5, $6)`, ["r_d__marketplace","public","products","GENERATED_COLUMN","searchVector","to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(description, ''))"]);
        await queryRunner.query(`CREATE TABLE "products" ("id" integer GENERATED ALWAYS AS IDENTITY NOT NULL, "name" character varying NOT NULL, "description" character varying NOT NULL, "price_cents" integer NOT NULL, "stock" integer NOT NULL DEFAULT '0', "category" character varying NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "searchVector" tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(description, ''))) STORED NOT NULL, "seller_id" integer NOT NULL, CONSTRAINT "CHK_1f5ec29fd762bd3d512d5a0434" CHECK ("stock" >= 0), CONSTRAINT "CHK_929de35715ade9cebfc4c400c7" CHECK ("price_cents" > 0), CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_products_search_vector" ON "products" USING gin ("searchVector") `);
        await queryRunner.query(`CREATE TABLE "order_items" ("id" integer GENERATED ALWAYS AS IDENTITY NOT NULL, "quantity" integer NOT NULL, "unit_price_cents" integer NOT NULL, "order_id" integer NOT NULL, "product_id" integer NOT NULL, CONSTRAINT "CHK_35fa83c4bc7d5d99dbcea2bbbc" CHECK ("unit_price_cents" >= 0), CONSTRAINT "CHK_b3b6503b13c66d4e90598ad46d" CHECK ("quantity" > 0), CONSTRAINT "PK_005269d8574e6fac0493715c308" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "orders" ("id" integer GENERATED ALWAYS AS IDENTITY NOT NULL, "status" text NOT NULL, "total_cents" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" integer NOT NULL, CONSTRAINT "CHK_73124423d96a8f9fd1aa0fb1a8" CHECK ("total_cents" >= 0), CONSTRAINT "CHK_b61a96114fd7b739023cdb0c0f" CHECK ("status" IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled')), CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_orders_pending_created" ON "orders"  ("created_at") WHERE "status" = 'pending'`);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_425ee27c69d6b8adc5d6475dcfe" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_items" ADD CONSTRAINT "FK_145532db85752b29c57d2b7b1f1" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_items" ADD CONSTRAINT "FK_9263386c35b6b242540f9493b00" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_a922b820eeef29ac1c6800e826a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_a922b820eeef29ac1c6800e826a"`);
        await queryRunner.query(`ALTER TABLE "order_items" DROP CONSTRAINT "FK_9263386c35b6b242540f9493b00"`);
        await queryRunner.query(`ALTER TABLE "order_items" DROP CONSTRAINT "FK_145532db85752b29c57d2b7b1f1"`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_425ee27c69d6b8adc5d6475dcfe"`);
        await queryRunner.query(`DROP INDEX "public"."idx_orders_pending_created"`);
        await queryRunner.query(`DROP TABLE "orders"`);
        await queryRunner.query(`DROP TABLE "order_items"`);
        await queryRunner.query(`DROP INDEX "public"."idx_products_search_vector"`);
        await queryRunner.query(`DROP TABLE "products"`);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "database" = $3 AND "schema" = $4 AND "table" = $5`, ["GENERATED_COLUMN","searchVector","r_d__marketplace","public","products"]);
        await queryRunner.query(`DROP TABLE "users"`);
    }

}
