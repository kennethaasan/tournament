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
            'start_date' => '2014-12-30',
            'end_date' => '2014-12-30',
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
                'name' => $faker->name()
            ));
        }

    }
}

class PlayersTableSeeder extends Seeder {

    public function run()
    {
        DB::table('players')->delete();

        $faker = Faker::create();

        foreach (range(1, 300) as $index) {
            Player::create(array(
                'name' => $faker->name(),
                'number' => $faker->numberBetween(1, 99),
                'team_id' => $faker->numberBetween(1, 30)
            ));
        }

    }
}


