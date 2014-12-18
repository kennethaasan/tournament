angular.module('app.services', [])

.service('popupService', function($window) {
    this.showPopup = function(message) {
        return $window.confirm(message);
    }
})

.factory('Tournament', function($resource) {
    return $resource('api/v1/tournaments/:id', { id: '@id' }, 
    	{
	        'update': { 
	        	method: 'PUT'
	        }
  		}
  	);
})

.factory('Team', function($resource) {
    return $resource('api/v1/teams/:id', { id: '@id' }, 
    	{
	        'update': { 
	        	method: 'PUT'
	        }
  		}
  	);
})

.factory('Player', function($resource) {
    return $resource('api/v1/players/:id', { id: '@id' }, 
    	{
	        'update': { 
	        	method: 'PUT'
	        }
  		}
  	);
});
