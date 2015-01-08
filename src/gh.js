var _ = require( "lodash" );
var when = require( "when" );
var lift = require( "when/node" ).lift;
var fs = require( "fs" );
var path = require( "path" );
var GHAPI = require( "github" );
var memory = require( "./rememory" );
var gists = memory( true );
var moment = require( "moment" );

var github = new GHAPI( {
	version: "3.0.0",
	debug: false,
	protocol: "https",
	host: "api.github.com",
	timeout: 10000
} );

function authenticateBasic( principle ) {
	var creds = {
		type: "basic",
		username: principle.user,
		password: principle.pass
	};
	if( principle.tfa ) {
		creds.headers = {
			"X-GitHub-OTP": principle.tfaCode
		};
	}
	github.authenticate( creds );
}

function authenticateToken( principle ) {
	github.authenticate( {
		type: "oauth",
		token: principle.token
	} );
}

function createGist( info ) {
	var existing = gists.remember( "local-gists" ) || [];
	var msg = {
		description: info.description,
		public: info.public,
		files: {}
	};
	var fileList = [];
	_.each( info.files, function( file ) {
		var relative = path.relative( process.cwd(), file );
		var name = relative.replace( path.sep, ":" );
		var content = fs.readFileSync( relative ).toString();
		if( content ) {
			fileList.push( name );
			msg.files[ name ] = { content: content };
		}
	} );
	var create = lift( github.gists.create );
	create( msg )
		.then( function( resp ) {
			existing.push( info.description );
			gists.remember( info.description, { files: fileList, id: resp.id } );
			gists.remember( "local-gists", existing );
			console.log( "Gist '" + info.description + "' created successfully" );
		} )
		.then( null, function( err ) {
			console.log( "Error occurred during gist creation: ", err.stack ? err.stack : err );
			console.log( msg );
		} );
}

function createToken( principle ) {
	var create = lift( github.authorization.create );
	var request = {
			scopes: [ "gist" ],
			note: "Token obtained by the GrappleHound on your behalf, " + moment( Date.now() ).toLocaleString(),
			note_url: "https://github.com/arobson/grapplehound" // jshint ignore:line
		};
	if( principle.tfa ) {
		request.headers = {
			"X-GitHub-OTP": principle.tfa
		};
	}
	return create( request )
		.then( function( doc ) {
			return _.merge( principle, doc );
		} )
		.catch( function() {
			return principle;
		} );
}

function downloadGists( selection ) {
	var existing = gists.remember( "local-gists" ) || [];
	existing = _.uniq( existing.concat( _.pluck( selection.gists, "description" ) ) );
	var get = lift( github.gists.get );
	_.each( selection.gists, function( item ) {
		console.log( "Fetching '" + item.description + "' ..." );
		get( { id: item.id } )
			.then( function( gist ) {
				var write = lift( fs.writeFile );
				var fileList = [];
				when.all( _.map( gist.files, function( data, file ) {
					fileList.push( file );
					file = file.split( ":" ).join( path.sep );
					var filePath = path.join( selection.target, file );
					return write( filePath, data.content )
						.then( function() {
							console.log( "'" + filePath + "' written successfully" );
						} )
						.then( null, function( err ) {
							console.log( "'" + filePath + "' failed with " + err.stack );
						} );
				} ) )
				.then( function() {
					gists.remember( item.description, { files: fileList, id: item.id } );
					gists.remember( "local-gists", existing );
				} );
			} );
	} );
}

function findToken( principle ) {
	var get = lift( github.authorization.getAll );
	var request = {};
	if( principle.tfa ) {
		request.headers = {
			"X-GitHub-OTP": principle.tfa
		};
	}
	return get( request )
		.then( function( list ) {
			var matches = _.where( list, { note_url: "https://github.com/arobson/grapplehound" } ); //jshint ignore:line
			if( matches.length ) {
				return _.merge( principle, _.pick( matches[ 0 ], "id", "token" ) );
			} else {
				return principle;
			}
		} )
		.catch( function() {
			return principle;
		} );
}

function getUsersGists( user, date ) {
	var opts = {
		user: user
	};
	if( date === "recent" ) {
		opts.since = moment().subtract( 1, "month" ).toISOString();
	} else if( date ) {
		opts.since = date;
	}
	var get = lift( github.gists.getFromUser );
	return get( opts )
		.then( function( gists ) {
			return _.map( gists, function( g ) {
				return _.pick( g, "description", "id" );
			} );
		} );
}

function updateGist( description ) {
	var gist = gists.remember( description );
	var msg = {
		id: gist.id,
		description: description,
		files: {}
	};
	var fileList = gist.files;
	var newList = _.clone( fileList );
	_.each( fileList, function( file ) {
		var relative = file.split( ":" ).join( path.sep );
		if( fs.existsSync( relative ) ) {
			msg.files[ file ] = { content: fs.readFileSync( relative ).toString() };
		} else {
			newList = _.without( newList, file );
			msg.files[ file ] = null;
		}
	} );
	var update = lift( github.gists.edit );
	update( msg )
		.then( function() {
			gists.remember( description, { files: newList, id: gist.id } );
			console.log( "Gist '" + description + "' updated successfully" );
		} )
		.then( null, function( err ) {
			console.log( "Error occurred trying to update the gist: ", err.stack ? err.stack : err );
		} );
}

module.exports = {
	authByCredentials: authenticateBasic,
	authByToken: authenticateToken,
	createGist: createGist,
	createToken: createToken,
	downloadGists: downloadGists,
	findToken: findToken,
	getUserGists: getUsersGists,
	updateGist: updateGist
};
