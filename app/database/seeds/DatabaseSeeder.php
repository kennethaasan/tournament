<?php


use \Faker\Factory as Faker;

class DatabaseSeeder extends Seeder {

	/**
	 * Run the database seeds.
	 *
	 * @return void
	 */
	public function run()
	{
        Eloquent::unguard();

		$this->call('UserTableSeeder');
		$this->command->info('User table seeded!');

        $this->call('TournamentTableSeeder');
        $this->command->info('Tournament table seeded!');

        $this->call('TeamsTableSeeder');
        $this->command->info('Team table seeded!');

        $this->call('PlayersTableSeeder');
        $this->command->info('Player table seeded!');

        $this->call('MatchesTableSeeder');
        $this->command->info('Match table seeded!');

        $this->call('GoalsTableSeeder');
        $this->command->info('Goal table seeded!');

	}

}

class UserTableSeeder extends Seeder {

    public function run()
    {
        DB::table('users')->delete();

        User::create(array(
            'email' => 'admin@admin.no',
            'password' => Hash::make('admin'),
            'admin' => true
        ));


        /*$faker = Faker::create();

        foreach (range(1, 47) as $index) {
            User::create(array(
                'email' => $faker->email(),
                'password' => Hash::make($faker->word(10)),
                'teacher' => false
            ));
        }*/

    }
}

class TournamentTableSeeder extends Seeder {

    public function run()
    {
        DB::table('tournaments')->delete();

        Tournament::create(array(
            'name' => 'Vanvikan Julecup 2014',
            'date' => '2014-12-30',
            'location' => 'Vanvikanhallen'
        ));

    }
}

class TeamsTableSeeder extends Seeder {

    public function run()
    {
        DB::table('teams')->delete();

        $faker = Faker::create();

        foreach (range(1, 30) as $index) {
            Team::create(array(
                'name' => $faker->name(),
                'group_code' => $faker->randomElement(['A', 'B', 'C', 'D'])
            ));
        }

    }
}

class PlayersTableSeeder extends Seeder {

    public function run()
    {
        DB::table('players')->delete();

        $faker = Faker::create();

        foreach (range(1, 200) as $index) {
            Player::create(array(
                'name' => $faker->name(),
                'number' => $faker->numberBetween(1, 99),
                'paid' => $faker->boolean(),
                'team_id' => $faker->numberBetween(1, 30)
            ));
        }

    }
}

class MatchesTableSeeder extends Seeder {

    public function run() {

        DB::table('matches')->delete();

        $faker = Faker::create();

        foreach (range(1, 30) as $index) {
            Match::create(array(
                'tournament_id' => 1,
                'kickoff_at'    => '11:00',
                'match_code'    => $faker->randomElement(['A', 'B', 'C', 'D', 'Q1', 'Q2', 'Q3', 'Q4', 'S1', 'S2', 'F']),
                'hometeam_id'   => $faker->numberBetween(1, 30),
                'awayteam_id'   => $faker->numberBetween(1, 30),
                'score_home'    => $faker->numberBetween(0, 9),
                'score_away'    => $faker->numberBetween(0, 9)
            ));
        }
    }
}

class GoalsTableSeeder extends Seeder {

    public function run() {

        DB::table('goals')->delete();

        $faker = Faker::create();

        foreach (range(1, 400) as $index) {
            Goal::create(array(
                'match_id'      => $faker->numberBetween(1, 30),
                'player_id'     => $faker->numberBetween(1, 200)
            ));
        }
    }
}


