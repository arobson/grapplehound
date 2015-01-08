var fs = require( "fs" );
var path = require( "path" );

function forget( memory, key ) {
	var exists = fs.existsSync( memory );
	var json = exists ? JSON.parse( fs.readFileSync( memory ) ) : {};
	if( exists && json && json[ key ] ) {
		delete json[ key ];
		fs.writeFileSync( memory, JSON.stringify( json ) );
	}
}

function remember( memory, key, val ) {
	var exists = fs.existsSync( memory );
	var json = exists ? JSON.parse( fs.readFileSync( memory ) ) : {};
	if( !val && !exists ) {
		return undefined;
	}
	if( !val ) {
		return json[ key ];
	} else {
		json[ key ] = val;
		fs.writeFileSync( memory, JSON.stringify( json ) );
	}
}

module.exports = function( local ) {
	var memory = local ? path.join( process.cwd(), ".grapplehound.json" ) : path.join( process.env.HOME, ".grapplehound.json" );
	return {
		forget: forget.bind( undefined, memory ),
		remember: remember.bind( undefined, memory )
	};
};
