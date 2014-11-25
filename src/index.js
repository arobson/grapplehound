var _ = require( "lodash" );
var commander = require( "commander" );
var command;
var machina = require( "machina" );

var local = require( "./local" );
var gh = require( "./gh" );
var prompt = require( "./prompt" ); // jshint ignore:line

var memory = require( "./rememory" );
var account = memory();

function addCommand( name, description ) {
	commander
		.command( name )
		.description( description )
		.action( function() {
			command = name;
		} );	
}

addCommand( "create", "Interactively create a new gist" );
addCommand( "list", "List locally downloaded gists" );
addCommand( "pull", "Select and download gists" );
addCommand( "purge", "Remove downloaded gist(s)" );
addCommand( "push", "Update a gist" );

var Machine = machina.Fsm.extend( {

	initialize: function() {

	},

	raiseResult: function( step ) {
		return function( result ) {
			this.handle( step + ".done", result );
		}.bind( this );
	},

	acquireTFA: function( principle ) {
		this.transition( "acquiringTFA" );
		this.handle( "acquire", principle );
	},

	checkTokens: function( principle ) {
		this.transition( "checkingRemoteTokens" );
		this.handle( "check", principle );
	},

	create: function() {
		local.getFiles()
			.then( function( x ) {
				prompt.newGist( x ).then( gh.createGist );
			} );
	},

	createToken: function( principle ) {
		this.transition( "creatingNewToken" );
		this.handle( "create", principle );
	},

	list: function() {
		local.getGists()
			.then( function( list ) {
				if( _.isEmpty( list ) ) {
					console.log( "No gists have been downloaded to '" + process.cwd() + "'" );
				} else {
					console.log( list.join( "\n" ) );
				}
			} );
	},

	login: function( principle ) {
		this.transition( "acquiringCredentials" );
		this.handle( "login", principle );
	},

	processCommand: function( principle ) {
		this.transition( "authenticated" );
		this.handle( "command", principle );
	},

	pull: function( principle ) {
		gh.getUserGists( principle.user )
			.then( prompt.remoteGists )
			.then( gh.downloadGists );
	},

	purge: function() {
		local.getGists()
			.then( prompt.localGists( " to purge" ) )
			.then( local.removeGists );
	},

	push: function() {
		local.getGists()
			.then( prompt.localGists( " to push", "list" ) )
			.then( function( description ) {
				return prompt.addFiles( description, local.getFiles() );
			} )
			.then( gh.updateGist );
	},

	initialState: "loading",
	states: {
		loading: {
			_onEnter: function() {
				var principle = {
					token: account.remember( "token" ),
					user: account.remember( "user" )
				};
				if( principle.token ) {
					gh.authByToken( principle );
					this.processCommand( principle );
				} else {
					this.login( principle );
				}
			}
		},
		acquiringCredentials: {
			login: function( principle ) {
				prompt.credentials( principle, this.raiseResult( "login" ) );
			},
			"login.done": function( principle ) {
				account.remember( "user", principle.user );
				gh.authByCredentials( principle );
				this.checkTokens( principle );
			}
		},
		checkingRemoteTokens: {
			check: function( principle ) {
				gh.findToken( principle )
					.then( this.raiseResult( "check" ) );
			},
			"check.done": function( principle ) {
				if( principle.token ) {
					account.remember( "token", principle.token );
					account.remember( "token-id", principle.id );
					gh.authByToken( principle );
					this.processCommand( principle );
				} else {
					this.createToken( principle );
				}
			}
		},
		creatingNewToken: {
			create: function( principle ) {
				gh.createToken( principle )
					.then( this.raiseResult( "create" ) );
			},
			"create.done": function( principle ) {
				if( principle.token ) {
					account.remember( "token", principle.token );
					account.remember( "token-id", principle.id );
					gh.authByToken( principle );
					this.processCommand( principle );
				} else {
					this.acquireTFA( principle );
				}
			}
		},
		acquiringTFA: {
			acquire: function( principle ) {
				prompt.twoFactor( principle, this.raiseResult( "acquire" ) );
			},
			"acquire.done": function( principle ) {
				gh.authByCredentials( principle );
				this.checkTokens( principle );
			}
		},
		authenticated: {
			command: function( principle ) {
				commander.parse( process.argv );
				if( command ) {
					this[ command ]( principle );
				} else {
					prompt.command( function( selection ) {
						this[ selection ]( principle );
					}.bind( this ) );
				}
			}
		}
	}
} );

module.exports = Machine;