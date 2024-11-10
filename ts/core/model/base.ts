import type { knex } from 'knex';

import Context from '../context.js'
import Knex from '../knex.js'

class BaseModel {
    context: Context;
    knex: knex;

    constructor(context: Context) {
        this.context = context;
        this.knex = Knex;
    }
}

export default BaseModel;