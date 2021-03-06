"use strict";

var debug = require( "debug" )( "restful-keystone" );
var _ = require( "lodash" );
var deepMerge = require( "deepmerge" );
var errors = require( "errors" );
var retrieve = require( "./retrieve" );
var utils = require( "../utils" );
var handleResult = utils.handleResult;
var getId = utils.getId;

module.exports = function( list,
                           config,
                           entry ){
  config = _.defaults( {
    name : list.path
  }, config );
  return {
    handle : function( req,
                       res,
                       next ){
      debug( "LIST", config.name );
      var id = getId( req );
      if( id ){
        return retrieve( list, config, entry ).handle( req, res, next );
      }
      var filter = req.query[ "filter" ] || req.body[ "filter" ];
      var selector = req.query[ "selector" ] || req.body[ "selector" ];
      var sort = req.query[ "sort" ] || req.body[ "sort" ];
      var limit = req.query[ "limit" ] || req.body[ "limit" ];
      var populate = req.query["populate"] || req.body["populate"];
      if( _.isString( filter ) ){
        try{
          filter = JSON.parse( filter );
        } catch( err ) {
          return next( new errors.Http400Error( {
            explanation : "Invalid JSON in query string parameter 'filter'"
          } ) );
        }
      }
      if( _.isString( selector ) ){
        try{
          selector = JSON.parse( selector );
        } catch( err ) {
          selector = null;
        }
      }
      if( _.isFunction( config.filter ) ){
        config.filter = config.filter();
      }
      filter = deepMerge( config.filter || {}, filter || {}, selector || {} );
      var q = list.model.find( filter, config.show + ' slug', config );

      if (_.isString(sort)) {
        try{
          sort = JSON.parse( sort );
          var prop = sort[0];
          if (prop.length) {
            var isDesc = (prop[1] && prop[1] === 'desc');
            if (isDesc) {
              q = q.sort('-' + prop[0]);
            } else {
              q = q.sort(prop[0]);
            }
          }
        } catch( err ) {
          q = q.sort(sort);
        }
      }
      if (_.isString(populate)) {
        q = q.populate(populate);
      }
      if (_.isString(limit) && _.isNumber(parseInt(limit, 10))) {
        q = q.limit(parseInt(limit, 10));
      }

      q.exec()
        .then( function( result ){
          result = handleResult( result || [], config );
          res.locals.body = result;
          res.locals.status = 200;
          next();
        } )
        .then( null, function( err ){
          next( err );
        } );
    },
    verb   : "get",
    url    : entry
  };
};
