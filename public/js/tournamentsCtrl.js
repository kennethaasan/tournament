angular.module('tournamentsCtrl', [])

	.controller('tournamentsCtrl', function($scope, $http, Tournament) {
		$scope.tournament;
		$scope.tournaments;
		$scope.tournamentData = {};

		// loading variable to show the spinning loading icon
		$scope.loading = true;

		// GET ALL Tournaments ====================================================
		Tournament.get()
			.success(function(data) {
				$scope.tournaments = data;
				$scope.loading = false;
			})
			.error(function(data) {
				console.log(data);
			});

		// Show A Tournament ======================================================
		$scope.showTournament = function(id) {
			$scope.loading = true;

			Tournament.show(id)
				.success(function(data) {

					$scope.tournament = data;
					$scope.loading = false;

				})
				.error(function(data) {
					console.log(data);
				});
		};

		// UPDATE A Tournament ======================================================
		$scope.updateTournament = function(id) {
			$scope.loading = true;

			Tournament.update($scope.tournamentData)
				.success(function(data) {

					$scope.showTournament(id);

				})
				.error(function(data) {
					console.log(data);
				});
		};

		// SAVE A Tournament ======================================================
		$scope.submitTournament = function() {
			$scope.loading = true;

			Tournament.save($scope.tournamentData)
				.success(function(data) {

					Tournament.get()
						.success(function(getData) {
							$scope.tournaments = getData;
							$scope.loading = false;
						});

				})
				.error(function(data) {
					console.log(data);
				});
		};

		// DELETE A Tournament ====================================================
		$scope.deleteTournament = function(id) {
			$scope.loading = true;

			Tournament.delete(id)
				.success(function(data) {

					Tournament.get()
						.success(function(getData) {
							$scope.tournaments = getData;
							$scope.loading = false;
						});

				});
		};

	});
