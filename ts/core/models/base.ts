import type { Knex } from 'knex';

import Context from '../context.js'
import KnexInstance  from '../knex.js'

class BaseModel {
    context: Context;
    knex: Knex;

    constructor(context: Context) {
        this.context = context;
        this.knex = KnexInstance;
    }
}

export default BaseModel;