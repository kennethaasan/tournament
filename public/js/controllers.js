/* Controllers */

angular.module('app.controllers', [])

.controller('HeaderController', function($scope, $location) {
    $scope.isActive = function(viewLocation) {
        return $location.path().indexOf(viewLocation) == 0;
    };
})

.controller('Tournaments', function($scope, Tournament) {

    $scope.loading = true;

    Tournament.get(function(response) {
        $scope.loading = false;
        $scope.tournaments = response.data;
    });

})
.controller('TournamentEdit', function($scope, $routeParams, Tournament) {

    $scope.loading = true;

    $scope.loadTournament = function() {
        Tournament.get({ id: $routeParams.id }, function(response) {
            $scope.loading = false;
            response.data.date = new Date(response.data.date);
            $scope.tournament = response.data;
        }, function(errors) {
            console.log(errors);
        });
    };

    $scope.updateTournament = function() {

        $scope.loading = true;
        $scope.errors = undefined;

        Tournament.update({ id: $scope.tournament.id }, $scope.tournament, function() {
            $scope.loadTournament();
        }, function(errors) {
            $scope.loading = false;
            $scope.errors = errors.data.error.validation_errors;
        });
    };

    $scope.loadTournament();

})
.controller('Matches', function($scope, $routeParams, Match) {

    $scope.loading = true;

    Match.get({ tournament_id: $routeParams.tournament_id }, function(response) {
        $scope.loading = false;
        $scope.matches = response.data;
    });

})
.controller('MatchEdit', function($scope, $routeParams, Match, Team, $location) {

    $scope.loading = true;
    $scope.teams = [];

    Team.get(function(response) {
        $scope.teams = response.data;
    });

    $scope.loadMatch = function() {
        if (! $scope.teams)
        {
            return setTimeout($scope.loadMatch, 100); // check again
        }

        Match.get({ tournament_id: $routeParams.tournament_id, id: $routeParams.id }, function(response) {
            $scope.loading = false;

            var time = response.data.kickoff_at.split(':');

            response.data.kickoff = (new Date());
            response.data.kickoff.setHours(time[0], time[1], time[2], 0);


            $scope.match = response.data;
        }, function(errors) {
            console.log(errors);
        });
    };

    $scope.updateMatch = function() {

        $scope.loading = true;
        $scope.errors = undefined;

        $scope.match.kickoff_at = $scope.match.kickoff.getHours() + ':' + $scope.match.kickoff.getMinutes();

        Match.update({ tournament_id: $scope.match.tournament_id, id: $scope.match.id }, $scope.match, function() {
            //$scope.loadMatch();
            // Go back to matches
            $location.path('/turneringer/' + $routeParams.tournament_id + '/kamper');
        }, function(errors) {
            $scope.loading = false;
            $scope.errors = errors.data.error.validation_errors;
        });
    };

    $scope.loadMatch();

})
.controller('Teams', function($scope, Team, popupService) {

    $scope.loading = true;

    $scope.loadTeams = function() {
        Team.get(function(response) {
            $scope.loading = false;
            $scope.teams = response.data;
        });
    };

    $scope.deleteTeam = function(team) {
        if (popupService.showPopup('Vil du slette dette laget?')) {

            $scope.loading = true;

            Team.remove({ id: team.id }, function(response) {
                $scope.loadTeams();
            }, function(errors) {
                console.log(errors);
            });
        }
    };

    $scope.loadTeams();

})
.controller('TeamEdit', function($scope, $routeParams, Team) {

    $scope.loading = true;

    $scope.loadTeam = function() {
        Team.get({ id: $routeParams.id }, function(response) {
            $scope.loading = false;
            $scope.team = response.data;
        }, function(errors) {
            console.log(errors);
        });
    };

    $scope.updateTeam = function() {

        $scope.loading = true;
        $scope.errors = undefined;
        Team.update({ id: $scope.team.id }, $scope.team, function() {
            $scope.loadTeam();
        }, function(errors) {
            $scope.loading = false;
            $scope.errors = errors.data.error.validation_errors;
        });
    };

    $scope.loadTeam();

})
.controller('Players', function($scope, $location, Player, popupService) {

    $scope.loading = true;

    $scope.loadPlayers = function() {
        Player.get(function(response) {
            $scope.loading = false;
            $scope.players = response.data;
        }, function() {
            $scope.loading = false;
            $scope.players = false;
        });
    };

    $scope.deletePlayer = function(player) {
        if (popupService.showPopup('Vil du slette denne spilleren?')) {

            $scope.loading = true;

            Player.remove({ id: player.id }, function(response) {
                $scope.loadPlayers();
            }, function(errors) {
                console.log(errors);
            });
        }
    };

    $scope.loadPlayers();

})
.controller('PlayerEdit', function($scope, $routeParams, Player, Team) {

    $scope.loading = true;

    $scope.teams = [];

    Team.get(function(response) {
        $scope.teams = response.data;
    });

    $scope.loadPlayer = function() {
        Player.get({ id: $routeParams.id }, function(response) {
            $scope.loading = false;
            $scope.player = response.data;
        }, function(errors) {
            console.log(errors);
        });
    };

    $scope.updatePlayer = function() {

        $scope.loading = true;
        $scope.errors = undefined;

        Player.update({ id: $scope.player.id }, $scope.player, function() {
            $scope.loadPlayer();
        }, function(errors) {
            $scope.loading = false;
            $scope.errors = errors.data.error.validation_errors;
            console.log(errors);
        });
    };

    $scope.loadPlayer();

})

.controller('PlayerNew', function($scope, $location, Player, Team) {

    $scope.player = new Player();

    $scope.teams = [];

    Team.get(function(response) {
        $scope.teams = response.data;
    });

    $scope.savePlayer = function() {

        $scope.loading = true;
        $scope.errors = undefined;

        Player.save($scope.player, function() {
            //Go back to players
            $location.path('/spillere');
        }, function(errors) {
            $scope.loading = false;
            $scope.errors = errors.data.error.validation_errors;
            console.log(errors);
        });
    };

})

.controller('PlayerNewTeam', function($scope, $location, Player, Team) {
    $scope.selectedTeam = new Player();

    $scope.players = [
      new Player()
    ];

    $scope.teams = [];

    Team.get(function(response) {
        $scope.teams = response.data;
    });

    $scope.addPlayer = function() {
      $scope.players.push(new Player());
    };

    $scope.savePlayers = function() {
        if (!$scope.selectedTeam.team_id) {
            return $scope.errors = {
              team_id: ['team id må fylles ut.']
            };
        }

        $scope.loading = true;
        $scope.errors = undefined;

        $scope.players.forEach(function(player) {
            player.team_id = $scope.selectedTeam.team_id;

            Player.save(player, function() {
                //Go back to players
                $location.path('/spillere');
            }, function(errors) {
                $scope.loading = false;
                $scope.errors = errors.data.error.validation_errors;
                console.log(errors);
            });
        });
    };
})

.controller('Goals', function($scope, $location, Goal, popupService) {

    $scope.loading = true;

    $scope.loadGoals = function() {
        Goal.get(function(response) {
            $scope.loading = false;
            $scope.goals = response.data;
        }, function(errors) {
            $scope.loading = false;
            $scope.goals = false;
        });
    };

    $scope.deleteGoal = function(goal) {
        if (popupService.showPopup('Vil du slette dette målet?')) {

            $scope.loading = true;

            Goal.remove({ id: goal.id }, function(response) {
                $scope.loadGoals();
            }, function(errors) {
                console.log(errors);
            });
        }
    };

    $scope.loadGoals();

})
.controller('GoalNew', function($scope, $location, Goal, Match, Player) {
    $scope.selectedMatch = new Goal();

    $scope.goals = [
        new Goal()
    ];

    $scope.matches = [];
    $scope.players = [];

    Match.get({ tournament_id: 1 }, function(response) {
        $scope.matches = response.data;
    });

    Player.get(function(response) {
        $scope.players = response.data;
    });

    $scope.addGoal = function() {
      $scope.goals.push(new Goal());
    };

    $scope.saveGoals = function() {
        if (!$scope.selectedMatch.match_id) {
            return $scope.errors = {
              match_id: ['match id må fylles ut.']
            };
        }

        $scope.loading = true;
        $scope.errors = undefined;

        $scope.goals.forEach(function(goal) {
            goal.match_id = $scope.selectedMatch.match_id;

            Goal.save(goal, function() {
                //Go back to maal
                $location.path('/maal');
            }, function(errors) {
                $scope.loading = false;
                $scope.errors = errors.data.error.validation_errors;
                console.log(errors);
            });
        });
    };
});
