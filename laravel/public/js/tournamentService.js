angular.module('tournamentService', [])

	.factory('Tournament', function($http) {

		return {
			// get all
			get : function() {
				return $http.get('/api/v1/tournaments');
			},

			// show
			show : function(id) {
				return $http.get('/api/v1/tournaments/' + id);
			}

			// save
			save : function(data) {
				return $http.post('/api/v1/tournaments/', data);
			},

			// update
			update : function(id, data) {
				return $http.put('/api/v1/tournaments/' + id, data);
			},

			// delete
			delete : function(id) {
				return $http.delete('/api/v1/tournaments/' + id);
			}
		}

	})

	.factory('Player', function($http) {

		return {
			// get all
			get : function() {
				return $http.get('/api/v1/players');
			},

			// show
			show : function(id) {
				return $http.get('/api/v1/players/' + id);
			}

			// save
			save : function(data) {
				return $http.post('/api/v1/players/', data);
			},

			// update
			update : function(id, data) {
				return $http.put('/api/v1/players/' + id, data);
			},

			// delete
			delete : function(id) {
				return $http.delete('/api/v1/players/' + id);
			}
		}

	})

	.factory('Team', function($http) {

		return {
			// get all
			get : function() {
				return $http.get('/api/v1/teams');
			},

			// show
			show : function(id) {
				return $http.get('/api/v1/teams/' + id);
			}

			// save
			save : function(data) {
				return $http.post('/api/v1/teams/', data);
			},

			// update
			update : function(id, data) {
				return $http.put('/api/v1/teams/' + id, data);
			},

			// delete
			delete : function(id) {
				return $http.delete('/api/v1/teams/' + id);
			}
		}

	});

