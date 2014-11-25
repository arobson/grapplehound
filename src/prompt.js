var _ = require( "lodash" );
var when = require( "when" );
var path = require( "path" );
var inquire = require( "inquirer" );
var memory = require( "./rememory" );
var gists = memory( true );
var account = memory();

function addFiles( description, list ) {
	var gist = gists.remember( description );
	var fileList = gist ? gist.files : [];
	var exclude = _.map( fileList, function( file ) {
		return path.join( process.cwd(), file.split( ":" ).join( path.sep ) );
	} );
	return when.promise( function( resolve ) {
		list.then( function( files ) {
			inquire.prompt( [
			{
				name: "add",
				message: "Would you like to add new files to this gist",
				type: "confirm",
				default: false
			} ], function( r ) {
				if( r.add ) {
					var eligible = _.xor( files, exclude );
					inquire.prompt( [
						{
							name: "files",
							message: "Select new files to add to the gist",
							type: "checkbox",
							choices: eligible
						}
					], function( r ) {
						var scrubbed = _.map( r.files, function( x ) { return x.split( path.sep ).join( ":" ); } );
						gist.files = gist.files.concat( scrubbed );
						gists.remember( description, gist );
						resolve( description );
					} );
				} else {
					resolve( description );
				}
			} );
		} );
	} );
}

function createNewGist( list ) {
	return when.promise( function( resolve ) {
		if( _.isEmpty( list ) ) {
			console.log( "No files available for upload" );
			resolve( {} );
		} else {
			inquire.prompt( [
				{
					type: "checkbox",
					name: "files",
					message: "Select which files to include",
					choices: list
				},
				{
					type: "input",
					name: "description",
					message: "Enter a description for your new gist"
				},
				{
					type: "confirm",
					name: "public",
					default: false,
					message: "Do you want this gist to be public"
				}
			], function( r ) {
				resolve( { 
					files: r.files, 
					description: r.description, 
					public: r.public 
				} );
			} );
		}
	} );
}

function getCredentials( principle, cb ) {
	inquire.prompt( [
		{
			type: "input",
			name: "user",
			message: "GitHub username",
			when: function() {
				return !principle.user;
			}
		},{
			type: "password",
			name: "pass",
			message: "Password"
		}
	], function( r ) {
		cb( r );
	} );
}

function getCommand( cb ) {
	inquire.prompt( [
		{
			type: "list",
			name: "command",
			message: "Command",
			choices: [ "create", "list", "pull", "purge", "push" ]
		}
	], function( r ) {
		cb( r.command );
	} );
}

function selectLocalGists( why, type ) {
	return function( gists ) {
		if( _.isEmpty( gists ) ) {
			console.log( "There are currently no known gists installed at '" + process.cwd() + "'" );
			return when( [] );
		}
		return when.promise( function( resolve ) {
			inquire.prompt( [
				{
					type: type ? type : "checkbox",
					name: "selections",
					message: "Select local gists " + why,
					choices: gists
				}
			], function( r ) {
				resolve( r.selections );
			} );
		} );
	};
}

function selectRemoteGists( list ) {
	return when.promise( function( resolve ) {
		inquire.prompt( [
			{
				type: "checkbox",
				name: "selections",
				message: "Select gists to download",
				choices: _.pluck( list, "description" )
			},
			{
				type: "input",
				name: "path",
				message: "Where should these files be downloaded", 
				default: gists.remember( "lastPath" ) || path.resolve( "./" )
			}
		], function( r ) {
			var target = path.resolve( r.path );
			account.remember( "lastDownload", r.selections );
			gists.remember( "lastPath", target );
			var items = _.map( r.selections, function( x ) {
				return _.where( list, { description: x } )[ 0 ];
			} );
			resolve( {
				target: target,
				gists: items
			} );
		} );
	} );
}

function twoFactorCode( principle, cb ) {
	inquire.prompt( [ {
		type: "input",
		name: "tfa",
		message: "Two-factor auth code"
	} ], function( r ) {
		principle.tfa = r.tfa;
		cb( principle );
	} );
}


module.exports = {
	addFiles: addFiles,
	credentials: getCredentials,
	command: getCommand,
	localGists: selectLocalGists,
	remoteGists: selectRemoteGists,
	newGist: createNewGist,
	twoFactor: twoFactorCode
};