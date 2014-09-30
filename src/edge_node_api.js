// this module is written for both nodejs, or for client with browserify.
'use strict';

var restful_api = require('./restful_api');


module.exports = restful_api.define_api({

    name: 'EdgeNode',

    methods: {

        connect_edge_node: {
            method: 'POST',
            path: '/node',
            params: {
                type: 'object',
                required: ['name', 'ip', 'port'],
                additionalProperties: false,
                properties: {
                    name: {
                        type: 'string',
                    },
                    ip: {
                        type: 'string',
                    },
                    port: {
                        type: 'number',
                    },
                }
            },
        },

        delete_edge_node: {
            method: 'DELETE',
            path: '/node',
            params: {
                type: 'object',
                required: ['name'],
                additionalProperties: false,
                properties: {
                    name: {
                        type: 'string',
                    },
                }
            },
        },

        heartbeat: {
            method: 'POST',
            path: '/hb',
            params: {
                type: 'object',
                required: ['space_total', 'space_used', 'num_blocks'],
                additionalProperties: false,
                properties: {
                    space_total: {
                        type: 'number',
                    },
                    space_used: {
                        type: 'number',
                    },
                    num_blocks: {
                        type: 'number',
                    },
                }
            },
            reply: {
                type: 'object',
                required: ['space_total', 'space_used', 'num_blocks'],
                additionalProperties: false,
                properties: {
                    space_total: {
                        type: 'number',
                    },
                    space_used: {
                        type: 'number',
                    },
                    num_blocks: {
                        type: 'number',
                    },
                }
            },
        },

    }

});
