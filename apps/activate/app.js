"use strict";

var	express = require( 'express' ),
	app = express();

var	Members = require( '../../src/js/database' ).Members,
	auth = require( '../../src/js/authentication' );

var messages = require( '../../src/messages.json' );

var app_config = {};

app.set( 'views', __dirname + '/views' );

app.get( '/' , function( req, res ) {
	res.locals.app = app_config;
	if ( req.user ) {
		req.flash( 'warning', messages['already-logged-in'] );
		res.redirect( '/profile' );
	} else {
		res.render( 'activate' );
	}
} );

app.get( '/:activation_code' , function( req, res ) {
	if ( req.user ) {
		req.flash( 'warning', messages['already-logged-in'] );
		res.redirect( '/profile' );
	} else if ( req.params.activation_code.match( /^\w{20}$/ ) == null ) {
		res.redirect( '/activate' );
	} else {
		res.render( 'activate', { activation_code: req.params.activation_code } );
	}
} );

app.post( '/' , function( req, res ) {
	if ( req.user ) {
		req.flash( 'warning', messages['already-logged-in'] );
		res.redirect( '/profile' );
	} else if ( req.body.activation_code.match( /^\w{20}$/ ) == null ) {
		req.flash( 'danger', messages['activation-error'] );
		res.redirect( '/activate' );
	} else {
		Members.findOne( {
			activation_code: req.body.activation_code,
		}, function ( err, user ) {
			
			if ( user == null ) {
				req.flash( 'danger', messages['activation-error'] );
				res.redirect( app.mountpath + '/' + req.body.activation_code );
				return;
			}

			auth.hashPassword( req.body.password, user.password_salt, function( hash ) {
				if ( user.password_hash != hash ) {
					req.flash( 'danger', messages['activation-error'] );
					res.redirect( app.mountpath + '/' + req.body.activation_code );
					return;
				}

				Members.update( {
					_id: user._id,
					password_hash: hash
				}, {
					$set: {
						activation_code: null,
						activated: true
					}
				}, function ( status ) {
					req.session.passport = { user: { _id: user._id } };
					req.flash( 'success', messages['activation-success'] )
					res.redirect( '/profile' );
				} )
			} );
		} );
	}
} );

module.exports = function( config ) {
	app_config = config;
	return app;
};