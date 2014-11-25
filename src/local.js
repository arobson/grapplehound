var _ = require( "lodash" );
var fs = require( "fs" );
var path = require( "path" );
var when = require( "when" );
var lift = require( "when/node" ).lift;
var glob = require( "globulesce" );
var memory = require( "./rememory" );
var gists = memory( true );

function listFiles() {
	return glob( process.cwd(), [ "{.,**}/*" ] );
}

function listLocalGists() {
	return when( gists.remember( "local-gists" ) );
}

function removeGists( items ) {
	var existing = gists.remember( "local-gists" ) || [];
	_.each( items, function( item ) {
		var gist = gists.remember( item );
		var files = gist ? gist.files : undefined;
		if( !files ) {
			console.log( "Could not determine which files belong to gist '" + item + "'" );
			existing = _.without( existing, item );
			gists.remember( "local-gists", existing );
		} else {
			console.log( "Removing gist '" + item + "': " + files.length + " files" );
			if( files && files.length ) {
				var remove = lift( fs.unlink );
				when.all( _.map( files, function( file ) {
					file = file.split( ":" ).join( path.sep );
					var filePath = path.resolve( file );
					console.log( "Removing file '" + filePath + "'" );
					return remove( filePath );
				} ) )
				.then( function() {
					existing = _.without( existing, item );
					gists.remember( "local-gists", existing );
					gists.forget( item );
				} );
			}	
		}		
	} );
}

module.exports = {
	getFiles: listFiles,
	getGists: listLocalGists,
	removeGists: removeGists
};